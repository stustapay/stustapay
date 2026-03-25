package de.stustapay.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.LocalContentColor
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorAmountOptionCard
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPaymentLayoutProfile

@Composable
fun PayOutSelection(
    status: String,
    payout: CheckedPayOut,
    amount: UInt,
    onAmountUpdate: (UInt) -> Unit,
    onAmountClear: () -> Unit,
    onSelectMaximumPayout: () -> Unit,
    usesMaximumPayout: Boolean,
    onClear: () -> Unit,
    ready: Boolean,
    onPayout: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val amountDialogState = rememberDialogDisplayState()
    val maxCents = payout.getMaxAmount()
    val canPayOut = payout.maxAmount >= 0.01

    OperatorPayOutAmountDialog(
        state = amountDialogState,
        maxCents = maxCents,
        amount = amount,
        onAmountUpdate = onAmountUpdate,
        onClear = onAmountClear,
    )

    OperatorAdaptivePaymentLayout(
        modifier = Modifier.fillMaxSize(),
        mainContent = { profile ->
            OperatorPayOutMainContent(
                profile = profile,
                maxCents = maxCents,
                displayAmount = amount,
                usesMaximumPayout = usesMaximumPayout,
                canPayOut = canPayOut,
                onSelectMaximumPayout = onSelectMaximumPayout,
                onCustomAmount = { amountDialogState.open() },
                onClear = onClear,
                status = status,
            )
        },
        railContent = { profile ->
            OperatorPayOutSummaryRail(
                profile = profile,
                canPayOut = canPayOut,
                ready = ready && canPayOut,
                onPayout = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onPayout()
                },
            )
        },
    )
}

@Composable
private fun OperatorPayOutMainContent(
    profile: OperatorPaymentLayoutProfile,
    maxCents: UInt,
    displayAmount: UInt,
    usesMaximumPayout: Boolean,
    canPayOut: Boolean,
    onSelectMaximumPayout: () -> Unit,
    onCustomAmount: () -> Unit,
    onClear: () -> Unit,
    status: String,
) {
    OperatorActionButton(
        text = stringResource(R.string.common_action_scan),
        onClick = onClear,
        primary = false,
    )
    StatusText(status, modifier = Modifier.padding(vertical = 4.dp))
    Row(
        horizontalArrangement = Arrangement.spacedBy(profile.gap),
        modifier = Modifier.fillMaxWidth(),
    ) {
        OperatorMetricCard(
            label = stringResource(R.string.payout_operator_full_balance),
            value = formatEuroAmountCents(maxCents),
            modifier = Modifier.weight(1f),
        )
        OperatorMetricCard(
            label = stringResource(R.string.operator_selected_amount),
            value = formatEuroAmountCents(displayAmount),
            accent = displayAmount > 0u,
            modifier = Modifier.weight(1f),
        )
    }

    OperatorPanel(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
            Text(
                text = stringResource(R.string.payout_operator_amount_title),
                color = OperatorPalette.title,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            if (!canPayOut) {
                Text(
                    text = stringResource(R.string.no_balance_for_payout),
                    color = OperatorPalette.subtitle,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium,
                )
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(profile.gap),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    OperatorAmountOptionCard(
                        title = stringResource(R.string.payout_operator_full_balance),
                        amount = formatEuroAmountCents(maxCents),
                        description = stringResource(R.string.payout_operator_full_balance_hint),
                        selected = usesMaximumPayout,
                        modifier = Modifier.weight(1f),
                        onClick = onSelectMaximumPayout,
                    )
                    OperatorAmountOptionCard(
                        title = stringResource(R.string.selfservice_custom_amount),
                        amount = if (!usesMaximumPayout) {
                            formatEuroAmountCents(displayAmount)
                        } else {
                            stringResource(R.string.operator_pending)
                        },
                        description = stringResource(R.string.topup_operator_custom_amount_hint),
                        selected = !usesMaximumPayout,
                        modifier = Modifier.weight(1f),
                        onClick = onCustomAmount,
                    )
                }
            }
        }
    }
}

@Composable
private fun OperatorPayOutSummaryRail(
    profile: OperatorPaymentLayoutProfile,
    canPayOut: Boolean,
    ready: Boolean,
    onPayout: () -> Unit,
) {
    val railModifier = if (profile.counterLayout) {
        Modifier.fillMaxHeight()
    } else {
        Modifier.fillMaxWidth()
    }
    Column(
        modifier = railModifier,
        verticalArrangement = if (profile.counterLayout) {
            Arrangement.Bottom
        } else {
            Arrangement.spacedBy(profile.gap)
        },
    ) {
        if (!canPayOut) {
            Text(
                text = stringResource(R.string.no_balance_for_payout),
                color = OperatorPalette.subtitle,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
            )
        }
        OperatorActionButton(
            text = stringResource(R.string.payout_payout),
            onClick = onPayout,
            enabled = ready,
        )
    }
}

@Composable
private fun OperatorPayOutAmountDialog(
    state: DialogDisplayState,
    maxCents: UInt,
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
                        config = AmountConfig.Money(limit = maxCents, cents = false),
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

private fun formatEuroAmountCents(cents: UInt): String = "%.2f€".format(cents.toDouble() / 100.0)
