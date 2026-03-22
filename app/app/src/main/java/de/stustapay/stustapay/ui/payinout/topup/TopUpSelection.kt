package de.stustapay.stustapay.ui.payinout.topup

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.ErrorDialog
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelectionDialog
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePanel
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import kotlinx.coroutines.launch

@Composable
fun TopUpSelection(
    viewModel: TopUpViewModel,
    onBack: (() -> Unit)? = null,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val uiLocked by viewModel.uiLocked.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val maxAmount = (topUpConfig.maxAccountBalance * 100).toUInt()

    val currentStep = when {
        requestActive -> 3
        topUpState.currentAmount == 0u -> 1
        else -> 2
    }

    if (errorMessage != null) {
        ErrorDialog(onDismiss = { scope.launch { viewModel.dismissError() } }) {
            Text(errorMessage ?: "", style = MaterialTheme.typography.h4)
        }
    }

    if (topUpConfig.hasOnlyTopUpPrivilege()) {
        SelfServiceTopUpContent(
            currentStep = currentStep,
            amount = topUpState.currentAmount,
            maxAmount = maxAmount,
            requestActive = requestActive,
            onAmountUpdate = { viewModel.setAmount(it) },
            onClear = { viewModel.clearDraft() },
            bottomPadding = 0.dp,
        )
    } else {
        OperatorTopUpSelection(
            viewModel = viewModel,
            onBack = onBack,
            footerHint = status,
            maxAmount = maxAmount,
            canHandleCash = topUpConfig.canHandleCash(),
            requestActive = requestActive,
            uiLocked = uiLocked,
            amount = topUpState.currentAmount,
        )
    }
}

@Composable
private fun SelfServiceTopUpContent(
    currentStep: Int,
    amount: UInt,
    maxAmount: UInt,
    requestActive: Boolean,
    onAmountUpdate: (UInt) -> Unit,
    onClear: () -> Unit,
    bottomPadding: androidx.compose.ui.unit.Dp
) {
    val profile = rememberSelfServiceDeviceProfile()
    val amountEuro = amount.toDouble() / 100
    val customAmountDialog = rememberDialogDisplayState()

    AmountSelectionDialog(
        state = customAmountDialog,
        config = AmountConfig.Money(limit = maxAmount, cents = false),
        initialAmount = { amount },
        onEnter = onAmountUpdate,
        onClear = onClear
    ) {
        Text(
            text = stringResource(R.string.selfservice_custom_amount),
            fontSize = if (profile.isSmallScreen) 22.sp else 28.sp
        )
    }

    SelfServiceBackground(
        modifier = Modifier
            .fillMaxSize()
            .padding(bottom = bottomPadding)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    horizontal = profile.contentPaddingHorizontal,
                    vertical = profile.contentPaddingVertical
                ),
            verticalArrangement = Arrangement.spacedBy(if (profile.isSmallScreen) 8.dp else 10.dp)
        ) {
            val subtitle = when (currentStep) {
                1 -> stringResource(R.string.topup_payment_instruction)
                2 -> stringResource(R.string.topup_step_scan)
                else -> stringResource(R.string.topup_step_payment)
            }

            SelfServiceHeadline(
                title = stringResource(R.string.selfservice_topup),
                subtitle = subtitle,
                titleFontSize = profile.headlineTitleSize,
                subtitleFontSize = profile.headlineSubtitleSize
            )

            SelfServiceTopUpStepper(
                currentStep = currentStep,
                isSmallScreen = profile.isSmallScreen
            )

            if (requestActive) {
                SelfServiceProcessingPanel(
                    modifier = Modifier.weight(1f),
                    isSmallScreen = profile.isSmallScreen
                )
            } else {
                SelfServiceAmountEditor(
                    modifier = Modifier.weight(1f),
                    amount = amount,
                    isSmallScreen = profile.isSmallScreen,
                    onAmountUpdate = onAmountUpdate,
                    onCustomAmount = { customAmountDialog.open() }
                )
            }

            SelfServicePanel(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = SelfServicePalette.panelMuted
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = stringResource(R.string.topup),
                        color = SelfServicePalette.title,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = if (profile.isSmallScreen) 15.sp else 18.sp
                    )
                    Text(
                        text = "${stringResource(R.string.topup)}: €${"%.2f".format(amountEuro)}",
                        color = SelfServicePalette.accent,
                        fontWeight = FontWeight.Bold,
                        fontSize = if (profile.isSmallScreen) 15.sp else 18.sp
                    )
                    Text(
                        text = if (requestActive) {
                            stringResource(R.string.topup_please_wait)
                        } else {
                            stringResource(R.string.topup_press_scan_pay)
                        },
                        color = SelfServicePalette.subtitle,
                        fontWeight = FontWeight.Medium,
                        fontSize = if (profile.isSmallScreen) 12.sp else 14.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun SelfServiceAmountEditor(
    modifier: Modifier,
    amount: UInt,
    isSmallScreen: Boolean,
    onAmountUpdate: (UInt) -> Unit,
    onCustomAmount: () -> Unit,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 8.dp)
    ) {
        SelfServicePanel(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = stringResource(R.string.topup_step_amount),
                    color = SelfServicePalette.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = if (isSmallScreen) 14.sp else 16.sp
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "€",
                        color = SelfServicePalette.subtitle,
                        fontWeight = FontWeight.Bold,
                        fontSize = if (isSmallScreen) 24.sp else 28.sp
                    )
                    Text(
                        text = "%.2f".format(amount.toDouble() / 100),
                        color = SelfServicePalette.title,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = if (isSmallScreen) 34.sp else 44.sp
                    )
                }
            }
        }

        if (isSmallScreen) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(10u, 20u, 30u).forEach { euro ->
                    SelfServiceQuickAmountChip(
                        amountEuro = euro,
                        selected = amount == euro * 100u,
                        onClick = { onAmountUpdate(euro * 100u) },
                        modifier = Modifier.weight(1f),
                        isSmallScreen = isSmallScreen
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SelfServiceQuickAmountChip(
                    amountEuro = 50u,
                    selected = amount == 50u * 100u,
                    onClick = { onAmountUpdate(50u * 100u) },
                    modifier = Modifier.weight(1f),
                    isSmallScreen = isSmallScreen
                )
                SelfServiceCustomAmountChip(
                    onClick = onCustomAmount,
                    modifier = Modifier.weight(1f),
                    isSmallScreen = isSmallScreen
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(10u, 20u, 30u, 50u).forEach { euro ->
                    SelfServiceQuickAmountChip(
                        amountEuro = euro,
                        selected = amount == euro * 100u,
                        onClick = { onAmountUpdate(euro * 100u) },
                        modifier = Modifier.weight(1f),
                        isSmallScreen = isSmallScreen
                    )
                }
                SelfServiceCustomAmountChip(
                    onClick = onCustomAmount,
                    modifier = Modifier.weight(1.2f),
                    isSmallScreen = isSmallScreen
                )
            }
        }
    }
}

@Composable
private fun SelfServiceCustomAmountChip(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isSmallScreen: Boolean,
) {
    Card(
        modifier = modifier,
        backgroundColor = SelfServicePalette.panelMuted,
        shape = RoundedCornerShape(24.dp),
        elevation = 0.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    1.5.dp,
                    SelfServicePalette.accent,
                    RoundedCornerShape(24.dp)
                )
                .clickable { onClick() }
                .padding(vertical = if (isSmallScreen) 6.dp else 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = stringResource(R.string.selfservice_custom_amount),
                color = SelfServicePalette.accent,
                fontWeight = FontWeight.Bold,
                fontSize = if (isSmallScreen) 13.sp else 15.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun TopUpSelfServiceStatus(status: String) {
    val profile = rememberSelfServiceDeviceProfile()
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 6.dp),
        backgroundColor = SelfServicePalette.panelMuted,
        shape = RoundedCornerShape(14.dp),
        elevation = 0.dp
    ) {
        Text(
            text = status,
            color = SelfServicePalette.subtitle,
            modifier = Modifier
                .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(14.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp),
            fontWeight = FontWeight.Medium,
            fontSize = if (profile.isSmallScreen) 14.sp else 16.sp,
            textAlign = TextAlign.Start
        )
    }
}

@Composable
private fun SelfServiceTopUpStepper(currentStep: Int, isSmallScreen: Boolean) {
    val steps = listOf(
        Pair(stringResource(R.string.topup_step_amount), 1),
        Pair(stringResource(R.string.topup_step_scan), 2),
        Pair(stringResource(R.string.topup_step_payment), 3)
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        steps.forEach { (label, stepNumber) ->
            val isDone = stepNumber < currentStep
            val isActive = stepNumber == currentStep
            val background = when {
                isDone -> Color(0xFF16342A)
                isActive -> Color(0xFF243A63)
                else -> SelfServicePalette.panelMuted
            }
            val border = when {
                isDone -> SelfServicePalette.success
                else -> SelfServicePalette.panelBorder
            }
            val textColor = when {
                isDone -> SelfServicePalette.successMuted
                isActive -> SelfServicePalette.title
                else -> SelfServicePalette.subtitle
            }
            val iconColor = when {
                isDone -> SelfServicePalette.success
                isActive -> SelfServicePalette.accent
                else -> SelfServicePalette.panelBorder
            }

            Card(
                modifier = Modifier.weight(1f),
                backgroundColor = background,
                elevation = 0.dp,
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .border(1.5.dp, border, RoundedCornerShape(12.dp))
                        .padding(
                            horizontal = if (isSmallScreen) 8.dp else 10.dp,
                            vertical = if (isSmallScreen) 10.dp else 12.dp
                        ),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(if (isSmallScreen) 19.dp else 22.dp)
                            .background(iconColor, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isDone) {
                            androidx.compose.material.Icon(
                                imageVector = Icons.Filled.Check,
                                contentDescription = null,
                                tint = SelfServicePalette.backgroundTop,
                                modifier = Modifier.size(14.dp)
                            )
                        } else {
                            Text(
                                text = stepNumber.toString(),
                                color = SelfServicePalette.backgroundTop,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                    Text(
                        text = label.substringAfter(": "),
                        color = textColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = if (isSmallScreen) 11.sp else 13.sp,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun SelfServiceQuickAmountChip(
    amountEuro: UInt,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isSmallScreen: Boolean
) {
    Card(
        modifier = modifier,
        backgroundColor = if (selected) SelfServicePalette.accent else SelfServicePalette.panelMuted,
        shape = RoundedCornerShape(24.dp),
        elevation = 0.dp,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    1.5.dp,
                    if (selected) SelfServicePalette.accent else SelfServicePalette.panelBorder,
                    RoundedCornerShape(24.dp)
                )
                .clickable { onClick() }
                .padding(vertical = if (isSmallScreen) 6.dp else 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "€$amountEuro",
                color = if (selected) SelfServicePalette.backgroundTop else SelfServicePalette.title,
                fontWeight = FontWeight.Bold,
                fontSize = if (isSmallScreen) 14.sp else 16.sp,
                modifier = Modifier.padding(horizontal = 6.dp)
            )
        }
    }
}

@Composable
private fun SelfServiceProcessingPanel(
    modifier: Modifier = Modifier,
    isSmallScreen: Boolean
) {
    SelfServicePanel(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(if (isSmallScreen) 54.dp else 68.dp)
                    .border(if (isSmallScreen) 4.dp else 5.dp, SelfServicePalette.accent, CircleShape),
            )
            Text(
                text = stringResource(R.string.topup_please_wait),
                color = SelfServicePalette.title,
                fontWeight = FontWeight.Bold,
                fontSize = if (isSmallScreen) 20.sp else 26.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 10.dp)
            )
            Text(
                text = stringResource(R.string.topup_payment_instruction),
                color = SelfServicePalette.subtitle,
                fontWeight = FontWeight.Medium,
                fontSize = if (isSmallScreen) 12.sp else 14.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
