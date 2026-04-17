package de.stustapay.stustapay.ui.payinout.topup

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.filled.ErrorOutline
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
import androidx.activity.compose.LocalActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.common.ErrorDialog
import de.stustapay.stustapay.ui.common.pay.CashECSelectionViewModel
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceActionButton
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePanel
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceSectionHeader
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch
import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.window.Dialog

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
        if (topUpConfig.hasOnlyTopUpPrivilege()) {
            SelfServiceTopUpErrorDialog(
                message = errorMessage.orEmpty(),
                onDismiss = {
                    scope.launch {
                        viewModel.dismissError()
                    }
                }
            )
        } else {
            ErrorDialog(onDismiss = { scope.launch { viewModel.dismissError() } }) {
                Text(errorMessage ?: "", style = MaterialTheme.typography.h4)
            }
        }
    }

    if (topUpConfig.hasOnlyTopUpPrivilege()) {
        val activity = LocalActivity.current as? Activity
        val paymentSelectionViewModel: CashECSelectionViewModel = hiltViewModel()
        val scanState = rememberNfcScanDialogState()

        NfcScanDialog(
            state = scanState,
            showClarification = true,
            onDismiss = {
                paymentSelectionViewModel.resetCustomerDisplay()
            },
            onScan = { tag ->
                paymentSelectionViewModel.resetCustomerDisplay()
                activity?.let { currentActivity ->
                    scope.launch {
                        viewModel.topUpWithCard(currentActivity, tag)
                    }
                }
            },
        )

        SelfServiceTopUpContent(
            status = status,
            currentStep = currentStep,
            amount = topUpState.currentAmount,
            maxAmount = maxAmount,
            requestActive = requestActive,
            uiLocked = uiLocked,
            onAmountUpdate = { viewModel.setAmount(it) },
            onClear = { viewModel.clearDraft() },
            onScanPay = {
                activity?.let { currentActivity ->
                    if (!viewModel.checkAmountLocal(topUpState.currentAmount.toDouble() / 100.0)) {
                        return@let
                    }
                    if (!viewModel.isCardReaderReady()) {
                        scope.launch {
                            viewModel.startCardReaderSetup(currentActivity)
                        }
                        return@let
                    }
                    paymentSelectionViewModel.showScanChipOnCustomerDisplay()
                    scanState.open()
                }
            },
            onBack = onBack,
            bottomPadding = 0.dp,
        )
    } else {
        OperatorTopUpSelection(
            viewModel = viewModel,
            onBack = onBack,
            terminalTitle = topUpConfig.title().title,
            footerHint = status,
            maxAmount = maxAmount,
            canHandleCard = topUpConfig.canHandleCardTopUp(),
            canHandleCash = topUpConfig.canHandleCash(),
            requestActive = requestActive,
            uiLocked = uiLocked,
            amount = topUpState.currentAmount,
            amountSelected = topUpState.amountSelected,
        )
    }
}

@Composable
private fun SelfServiceTopUpErrorDialog(
    message: String,
    onDismiss: () -> Unit,
) {
    val profile = rememberSelfServiceDeviceProfile()

    Dialog(onDismissRequest = onDismiss) {
        SelfServicePanel(
            modifier = Modifier.widthIn(min = 320.dp, max = 560.dp),
            borderColor = SelfServicePalette.error,
            backgroundColor = SelfServicePalette.errorPanel
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Filled.ErrorOutline,
                    contentDescription = null,
                    tint = SelfServicePalette.error,
                    modifier = Modifier.size(if (profile.isSmallScreen) 34.dp else 42.dp)
                )
                Text(
                    text = stringResource(R.string.topup_error_title),
                    color = SelfServicePalette.errorMuted,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = if (profile.isSmallScreen) 22.sp else 28.sp,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = message,
                    color = SelfServicePalette.errorMuted,
                    fontWeight = FontWeight.Medium,
                    fontSize = if (profile.isSmallScreen) 16.sp else 18.sp,
                    textAlign = TextAlign.Center
                )
                SelfServiceActionButton(
                    text = stringResource(R.string.back),
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    primary = false,
                    fontSize = profile.buttonTextSize
                )
            }
        }
    }
}

@Composable
private fun SelfServiceTopUpContent(
    status: String,
    currentStep: Int,
    amount: UInt,
    maxAmount: UInt,
    requestActive: Boolean,
    uiLocked: Boolean,
    onAmountUpdate: (UInt) -> Unit,
    onClear: () -> Unit,
    onScanPay: () -> Unit,
    onBack: (() -> Unit)?,
    bottomPadding: androidx.compose.ui.unit.Dp
) {
    val profile = rememberSelfServiceDeviceProfile()
    val customAmountDialog = rememberDialogDisplayState()

    TopUpAmountDialog(
        state = customAmountDialog,
        maxAmount = maxAmount,
        amount = amount,
        onAmountUpdate = onAmountUpdate,
        onClear = onClear,
    )

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

            SelfServiceSectionHeader(
                title = stringResource(R.string.selfservice_topup),
                subtitle = subtitle,
                titleFontSize = profile.headlineTitleSize,
                subtitleFontSize = profile.headlineSubtitleSize,
                showLanguageSelector = false
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

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SelfServiceActionButton(
                    text = stringResource(R.string.topup_back_to_start),
                    onClick = { onBack?.invoke() },
                    modifier = Modifier.weight(0.85f),
                    primary = false,
                    enabled = onBack != null && !requestActive && !uiLocked,
                    fontSize = profile.buttonTextSize
                )
                SelfServiceActionButton(
                    text = stringResource(R.string.selfservice_scan_pay),
                    onClick = onScanPay,
                    modifier = Modifier.weight(1.15f),
                    enabled = amount > 0u && !requestActive && !uiLocked,
                    fontSize = profile.buttonTextSize
                )
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
                SelfServiceQuickAmountChip(
                    amountEuro = 100u,
                    selected = amount == 100u * 100u,
                    onClick = { onAmountUpdate(100u * 100u) },
                    modifier = Modifier.weight(1f),
                    isSmallScreen = isSmallScreen
                )
            }
        } else {
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
                listOf(50u, 100u).forEach { euro ->
                    SelfServiceQuickAmountChip(
                        amountEuro = euro,
                        selected = amount == euro * 100u,
                        onClick = { onAmountUpdate(euro * 100u) },
                        modifier = Modifier.weight(1f),
                        isSmallScreen = isSmallScreen
                    )
                }
            }
        }

        SelfServiceActionButton(
            text = stringResource(R.string.selfservice_custom_amount),
            onClick = onCustomAmount,
            modifier = Modifier.fillMaxWidth(),
            primary = false,
            fontSize = if (isSmallScreen) 16.sp else 18.sp,
            height = if (isSmallScreen) 60.dp else 64.dp
        )
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
    val chipHeight = if (isSmallScreen) 72.dp else 88.dp
    val borderColor = if (selected) SelfServicePalette.accent else SelfServicePalette.title.copy(alpha = 0.32f)
    Card(
        modifier = modifier.height(chipHeight),
        backgroundColor = if (selected) SelfServicePalette.accent else SelfServicePalette.interactivePanel,
        shape = RoundedCornerShape(24.dp),
        elevation = 0.dp,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .fillMaxWidth()
                .border(
                    if (selected) 2.dp else 1.5.dp,
                    borderColor,
                    RoundedCornerShape(24.dp)
                )
                .clickable { onClick() }
                .padding(horizontal = if (isSmallScreen) 8.dp else 10.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "€$amountEuro",
                color = if (selected) SelfServicePalette.backgroundTop else SelfServicePalette.title,
                fontWeight = FontWeight.Bold,
                fontSize = if (isSmallScreen) 20.sp else 24.sp,
                textAlign = TextAlign.Center,
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
