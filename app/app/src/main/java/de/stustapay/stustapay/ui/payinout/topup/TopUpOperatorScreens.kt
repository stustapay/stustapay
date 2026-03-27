package de.stustapay.stustapay.ui.payinout.topup

import android.app.Activity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Text
import androidx.compose.material.Icon
import androidx.compose.material.LocalContentColor
import androidx.compose.material.Surface
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanDialogVariant
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.operator.OperatorCompactFlowHeader
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorAmountOptionCard
import de.stustapay.stustapay.ui.common.operator.OperatorBackground
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPaymentLayoutProfile
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import de.stustapay.stustapay.ui.common.pay.CashECSelectionViewModel
import kotlinx.coroutines.launch

private enum class TopUpPaymentMethod {
    Card,
    Cash,
}

@Composable
fun OperatorTopUpSelection(
    viewModel: TopUpViewModel,
    onBack: (() -> Unit)? = null,
    terminalTitle: String,
    footerHint: String,
    maxAmount: UInt,
    canHandleCard: Boolean,
    canHandleCash: Boolean,
    requestActive: Boolean,
    uiLocked: Boolean,
    amount: UInt,
) {
    val scope = rememberCoroutineScope()
    val context = LocalActivity.current as Activity
    val scanState = rememberNfcScanDialogState()
    val amountDialogState = rememberDialogDisplayState()
    val paymentSelectionViewModel: CashECSelectionViewModel = hiltViewModel()
    var pendingMethod by remember { mutableStateOf<TopUpPaymentMethod?>(null) }
    var showCashConfirm by remember { mutableStateOf(false) }

    NfcScanDialog(
        state = scanState,
        showClarification = false,
        variant = NfcScanDialogVariant.Operator,
        onDismiss = { paymentSelectionViewModel.resetCustomerDisplay() },
        onScan = { tag ->
            paymentSelectionViewModel.resetCustomerDisplay()
            scope.launch {
                when (pendingMethod) {
                    TopUpPaymentMethod.Card -> viewModel.topUpWithCard(context, tag)
                    TopUpPaymentMethod.Cash -> viewModel.topUpWithCash(tag)
                    null -> Unit
                }
                pendingMethod = null
            }
        },
    )

    TopUpAmountDialog(
        state = amountDialogState,
        maxAmount = maxAmount,
        amount = amount,
        onAmountUpdate = viewModel::setAmount,
        onClear = viewModel::clearDraft,
    )

    if (showCashConfirm) {
        OperatorTopUpCashConfirmDialog(
            amount = amount,
            onDismiss = { showCashConfirm = false },
            onConfirm = {
                showCashConfirm = false
                pendingMethod = TopUpPaymentMethod.Cash
                paymentSelectionViewModel.showScanChipOnCustomerDisplay()
                scanState.open()
            },
        )
    }

    val showOwnFlowHeader = onBack != null
    @Composable
    fun TopUpBody() {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (showOwnFlowHeader) {
                        Modifier.padding(12.dp)
                    } else {
                        Modifier
                    },
                ),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (showOwnFlowHeader) {
                BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                    OperatorCompactFlowHeader(
                        flowTitle = stringResource(R.string.topup),
                        tillLabel = terminalTitle.takeIf { it.isNotBlank() },
                        onBack = onBack,
                        compactHandheld = maxWidth < 760.dp,
                    )
                }
            }

            OperatorAdaptivePaymentLayout(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                mainContent = { profile ->
                    OperatorTopUpMainContent(
                        profile = profile,
                        amount = amount,
                        maxAmount = maxAmount,
                        footerHint = footerHint,
                        requestActive = requestActive,
                        onAmountSelected = viewModel::setAmount,
                        onCustomAmount = { amountDialogState.open() },
                    )
                },
                railContent = { profile ->
                    OperatorTopUpSummaryRail(
                        profile = profile,
                        amount = amount,
                        canHandleCard = canHandleCard,
                        canHandleCash = canHandleCash,
                        footerHint = footerHint,
                        requestActive = requestActive,
                        uiLocked = uiLocked,
                        onCard = {
                            if (!canHandleCard) {
                                return@OperatorTopUpSummaryRail
                            }
                            if (!viewModel.checkAmountLocal(amount.toDouble() / 100.0)) {
                                return@OperatorTopUpSummaryRail
                            }
                            if (!viewModel.isCardReaderReady()) {
                                scope.launch {
                                    viewModel.startCardReaderSetup(context)
                                }
                                return@OperatorTopUpSummaryRail
                            }
                            pendingMethod = TopUpPaymentMethod.Card
                            paymentSelectionViewModel.showScanChipOnCustomerDisplay()
                            scanState.open()
                        },
                        onCash = {
                            if (!viewModel.checkAmountLocal(amount.toDouble() / 100.0)) {
                                return@OperatorTopUpSummaryRail
                            }
                            showCashConfirm = true
                        },
                    )
                },
            )
        }
    }

    if (showOwnFlowHeader) {
        OperatorBackground {
            TopUpBody()
        }
    } else {
        TopUpBody()
    }
}

@Composable
private fun OperatorTopUpMainContent(
    profile: OperatorPaymentLayoutProfile,
    amount: UInt,
    maxAmount: UInt,
    footerHint: String,
    requestActive: Boolean,
    onAmountSelected: (UInt) -> Unit,
    onCustomAmount: () -> Unit,
) {
    val quickAmounts = listOf(1000u, 2000u, 5000u)
    val customSelected = amount > 0u && amount !in quickAmounts
    val quickAmountFontSize = if (profile.counterLayout) 32.sp else 28.sp

    Row(
        horizontalArrangement = Arrangement.spacedBy(profile.gap),
        modifier = Modifier.fillMaxWidth(),
    ) {
        OperatorMetricCard(
            label = stringResource(R.string.operator_selected_amount),
            value = if (amount > 0u) formatEuroAmount(amount) else formatEuroAmount(0u),
            accent = amount > 0u,
            modifier = Modifier.weight(1f),
        )
        OperatorMetricCard(
            label = stringResource(R.string.topup_operator_max_balance),
            value = formatEuroAmount(maxAmount),
            modifier = Modifier.weight(1f),
        )
    }

    OperatorPanel(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
            Text(
                text = stringResource(R.string.topup_operator_amount_title),
                color = OperatorPalette.title,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(profile.gap),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    quickAmounts.take(2).forEach { quickAmount ->
                        OperatorAmountOptionCard(
                            amount = formatEuroAmount(quickAmount),
                            amountFontSize = quickAmountFontSize,
                            selected = amount == quickAmount,
                            modifier = Modifier
                                .weight(1f)
                                .height(profile.cardHeight),
                            onClick = { onAmountSelected(quickAmount) },
                        )
                    }
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(profile.gap),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    OperatorAmountOptionCard(
                        amount = formatEuroAmount(quickAmounts[2]),
                        amountFontSize = quickAmountFontSize,
                        selected = amount == quickAmounts[2],
                        modifier = Modifier
                            .weight(1f)
                            .height(profile.cardHeight),
                        onClick = { onAmountSelected(quickAmounts[2]) },
                    )
                    OperatorAmountOptionCard(
                        title = stringResource(R.string.selfservice_custom_amount),
                        amount = if (customSelected && amount > 0u) formatEuroAmount(amount) else "",
                        description = stringResource(R.string.topup_operator_custom_amount_hint),
                        selected = customSelected,
                        modifier = Modifier
                            .weight(1f)
                            .height(profile.cardHeight),
                        onClick = onCustomAmount,
                    )
                }
            }
        }
    }

    val statusHint = footerHint.takeUnless { it.isBlank() || it == "ready" }
    if (requestActive || statusHint != null) {
        OperatorPanel(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (profile.counterLayout) Modifier else Modifier),
            backgroundColor = OperatorPalette.panelMuted,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = if (requestActive) {
                        stringResource(R.string.topup_please_wait)
                    } else {
                        statusHint.orEmpty()
                    },
                    color = OperatorPalette.title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                Text(
                    text = stringResource(R.string.topup_press_scan_pay),
                    color = OperatorPalette.subtitle,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
private fun OperatorTopUpSummaryRail(
    profile: OperatorPaymentLayoutProfile,
    amount: UInt,
    canHandleCard: Boolean,
    canHandleCash: Boolean,
    footerHint: String,
    requestActive: Boolean,
    uiLocked: Boolean,
    onCard: () -> Unit,
    onCash: () -> Unit,
) {
    val hasAnyPaymentMethod = canHandleCard || canHandleCash
    OperatorPanel(
        modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panelMuted,
    ) {
        if (profile.counterLayout) {
            Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
                Text(
                    text = stringResource(R.string.topup_operator_summary_title),
                    color = OperatorPalette.title,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                OperatorRailSummaryRow(
                    label = stringResource(R.string.operator_payment_method),
                    value = if (canHandleCard && canHandleCash) {
                        "${stringResource(R.string.pay_card).replace("\n", " / ")}"
                    } else if (canHandleCard) {
                        stringResource(R.string.pay_card).replace("\n", " ")
                    } else if (canHandleCash) {
                        stringResource(R.string.topup_operator_take_cash)
                    } else {
                        stringResource(R.string.topup_operator_no_payment_method_help)
                    },
                )
                if (!hasAnyPaymentMethod) {
                    Text(
                        text = stringResource(R.string.topup_operator_no_payment_method_help),
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
                val statusHint = footerHint.takeUnless { it.isBlank() || it == "ready" }
                if (statusHint != null) {
                    Text(
                        text = statusHint,
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
                if (canHandleCard) {
                    OperatorActionButton(
                        text = stringResource(R.string.topup_operator_scan_pay),
                        onClick = onCard,
                        enabled = amount > 0u && !requestActive && !uiLocked,
                    )
                }
                if (canHandleCash) {
                    OperatorActionButton(
                        text = stringResource(R.string.topup_operator_take_cash),
                        onClick = onCash,
                        enabled = amount > 0u && !requestActive && !uiLocked,
                        primary = false,
                    )
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!hasAnyPaymentMethod) {
                    Text(
                        text = stringResource(R.string.topup_operator_no_payment_method_help),
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
                if (canHandleCard) {
                    OperatorActionButton(
                        text = stringResource(R.string.topup_operator_scan_pay),
                        onClick = onCard,
                        enabled = amount > 0u && !requestActive && !uiLocked,
                    )
                }
                if (canHandleCash) {
                    OperatorActionButton(
                        text = stringResource(R.string.topup_operator_take_cash),
                        onClick = onCash,
                        enabled = amount > 0u && !requestActive && !uiLocked,
                        primary = false,
                    )
                }
            }
        }
    }
}

@Composable
fun TopUpAmountDialog(
    state: de.stustapay.libssp.ui.common.DialogDisplayState,
    maxAmount: UInt,
    amount: UInt,
    onAmountUpdate: (UInt) -> Unit,
    onClear: () -> Unit,
) {
    if (!state.isOpen()) {
        return
    }

    var currentAmount by remember(state.isOpen(), amount) { mutableStateOf(amount) }

    Dialog(onDismissRequest = { state.close() }) {
        OperatorPanel(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = stringResource(R.string.selfservice_custom_amount),
                    color = OperatorPalette.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                CompositionLocalProvider(LocalContentColor provides OperatorPalette.title) {
                    AmountSelection(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(420.dp),
                        amount = currentAmount,
                        onAmountUpdate = { currentAmount = it },
                        onClear = {
                            currentAmount = 0u
                            onClear()
                        },
                        config = AmountConfig.Money(limit = maxAmount, cents = false),
                    )
                }
                OperatorActionButton(
                    text = stringResource(R.string.check_ok),
                    onClick = {
                        onAmountUpdate(currentAmount)
                        state.close()
                    },
                )
                OperatorActionButton(
                    text = stringResource(R.string.arrow_back),
                    onClick = { state.close() },
                    primary = false,
                )
            }
        }
    }
}

@Composable
private fun OperatorTopUpCashConfirmDialog(
    amount: UInt,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        OperatorPanel(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = stringResource(R.string.topup_operator_cash_confirm_title),
                    color = OperatorPalette.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                OperatorRailSummaryRow(
                    label = stringResource(R.string.operator_selected_amount),
                    value = formatEuroAmount(amount),
                    accent = true,
                )
                OperatorActionButton(
                    text = stringResource(R.string.topup_operator_take_cash),
                    onClick = onConfirm,
                )
                OperatorActionButton(
                    text = stringResource(R.string.arrow_back),
                    onClick = onDismiss,
                    primary = false,
                )
            }
        }
    }
}

@Composable
fun OperatorTopUpSuccess(
    terminalTitle: String,
    footerHint: String,
    completedTopUp: de.stustapay.api.models.CompletedTopUp,
    onDismiss: () -> Unit,
) {
    OperatorScaffold(
        title = terminalTitle,
        subtitle = stringResource(R.string.topup_success_subtitle),
        icon = Icons.Filled.CheckCircle,
        terminalLabel = stringResource(R.string.topup),
        footerHint = footerHint,
        footerSection = stringResource(R.string.topup),
        footerStatus = stringResource(R.string.operator_status_complete),
        showFooter = false,
        onBack = onDismiss,
        headerFlowTitle = stringResource(R.string.topup),
        headerTillLabel = terminalTitle,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                OperatorStatePanel(
                    title = stringResource(R.string.topup_success_title),
                    message = stringResource(R.string.topup_success_subtitle),
                    success = true,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(profile.gap),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    OperatorMetricCard(
                        label = stringResource(R.string.previous_balance),
                        value = formatEuroAmount(completedTopUp.oldBalance),
                        modifier = Modifier.weight(1f),
                    )
                    OperatorMetricCard(
                        label = stringResource(R.string.topup),
                        value = formatEuroAmount(completedTopUp.amount),
                        accent = true,
                        modifier = Modifier.weight(1f),
                    )
                }
            },
            railContent = {
                OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = stringResource(R.string.topup_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.operator_updated_balance),
                            value = formatEuroAmount(completedTopUp.newBalance),
                            accent = true,
                        )
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.operator_collected_total),
                            value = formatEuroAmount(completedTopUp.amount),
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.topup_operator_start_next),
                            onClick = onDismiss,
                        )
                    }
                }
            },
        )
    }
}

@Composable
fun OperatorTopUpError(
    terminalTitle: String,
    footerHint: String,
    onDismiss: () -> Unit,
) {
    OperatorScaffold(
        title = terminalTitle,
        subtitle = footerHint,
        icon = Icons.Filled.ErrorOutline,
        terminalLabel = stringResource(R.string.topup),
        footerHint = footerHint,
        footerSection = stringResource(R.string.topup),
        footerStatus = stringResource(R.string.operator_status_issue),
        showFooter = false,
        onBack = onDismiss,
        headerFlowTitle = stringResource(R.string.topup),
        headerTillLabel = terminalTitle,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = {
                OperatorStatePanel(
                    title = stringResource(R.string.topup_error_title),
                    message = footerHint,
                    success = false,
                )
            },
            railContent = {
                OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = stringResource(R.string.topup_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.operator_status_issue),
                            value = stringResource(R.string.topup_try_again),
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.topup_operator_back_to_amount),
                            onClick = onDismiss,
                            destructive = true,
                        )
                    }
                }
            },
        )
    }
}

private fun formatEuroAmount(cents: UInt): String = "%.2f€".format(cents.toDouble() / 100.0)

private fun formatEuroAmount(amount: Double): String = "%.2f€".format(amount)
