package de.stustapay.stustapay.ui.payinout.postpayment

import android.app.Activity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.stustapay.ui.payinout.payout.CheckedPayOut
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPaymentLayoutProfile
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import kotlinx.coroutines.launch
import kotlin.math.abs

@Composable
fun OperatorPostPaymentSelection(
    leaveView: () -> Unit,
    viewModel: PostPaymentViewModel,
    payout: CheckedPayOut,
    requestActive: Boolean,
    status: String,
    onClear: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalActivity.current as Activity
    val selectedAmount by viewModel.postPaymentState.collectAsStateWithLifecycle()
    val terminalLoginState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    var showCashConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(payout.uuid) {
        viewModel.setAmount(-payout.maxAmount)
    }

    if (showCashConfirm) {
        OperatorPostPaymentCashConfirmDialog(
            amount = selectedAmount.currentAmount,
            onDismiss = { showCashConfirm = false },
            onConfirm = {
                showCashConfirm = false
                scope.launch {
                    viewModel.topUpWithCash(payout.tag)
                }
            },
        )
    }

    val currentAmount = selectedAmount.currentAmount

    OperatorScaffold(
        title = terminalLoginState.title().title,
        subtitle = stringResource(R.string.postpayment_operator_subtitle),
        icon = Icons.Filled.PointOfSale,
        terminalLabel = stringResource(R.string.root_item_post_payment),
        footerHint = status,
        footerSection = stringResource(R.string.root_item_post_payment),
        footerStatus = if (requestActive) {
            stringResource(R.string.operator_pending)
        } else {
            formatEuroAmount(currentAmount)
        },
        showFooter = false,
        onBack = leaveView,
        headerFlowTitle = stringResource(R.string.root_item_post_payment),
        headerTillLabel = terminalLoginState.title().title,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                OperatorPostPaymentMainContent(
                    profile = profile,
                    payout = payout,
                )
            },
            railContent = { profile ->
                OperatorPostPaymentSummaryRail(
                    profile = profile,
                    requestActive = requestActive,
                    onCollectCard = {
                        scope.launch {
                            viewModel.topUpWithCard(context, payout.tag)
                        }
                    },
                    onCollectCash = { showCashConfirm = true },
                    onClear = onClear,
                )
            },
        )
    }
}

@Composable
private fun OperatorPostPaymentMainContent(
    profile: OperatorPaymentLayoutProfile,
    payout: CheckedPayOut,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(profile.gap),
        modifier = Modifier.fillMaxWidth(),
    ) {
        OperatorMetricCard(
            label = stringResource(R.string.operator_customer_wristband),
            value = payout.tag.uidHex().takeLast(8),
            modifier = Modifier.weight(1f),
        )
        OperatorMetricCard(
            label = stringResource(R.string.operator_outstanding),
            value = formatEuroAmount(abs(payout.maxAmount)),
            accent = true,
            modifier = Modifier.weight(1f),
        )
    }

    OperatorPanel(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = stringResource(R.string.operator_outstanding),
                color = OperatorPalette.title,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "${stringResource(R.string.operator_customer_wristband)}: ${payout.tag.uidHex().takeLast(8)}",
                color = OperatorPalette.subtitle,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = formatEuroAmount(abs(payout.maxAmount)),
                color = OperatorPalette.accent,
                fontSize = 36.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = stringResource(R.string.postpayment_guidance),
                color = OperatorPalette.subtitle,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                fontWeight = FontWeight.Medium,
            )
            if (profile.counterLayout) {
                Text(
                    text = stringResource(R.string.postpayment_guidance_compact),
                    color = OperatorPalette.subtitle,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
private fun OperatorPostPaymentSummaryRail(
    profile: OperatorPaymentLayoutProfile,
    requestActive: Boolean,
    onCollectCard: () -> Unit,
    onCollectCash: () -> Unit,
    onClear: () -> Unit,
) {
    OperatorPanel(
        modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panelMuted,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
            OperatorStatePanel(
                title = if (requestActive) {
                    stringResource(R.string.postpayment_collecting_title)
                } else {
                    stringResource(R.string.postpayment_ready_collect_title)
                },
                message = if (requestActive) {
                    stringResource(R.string.postpayment_collecting_message)
                } else {
                    stringResource(R.string.postpayment_ready_collect_message)
                },
                success = true,
            )
            OperatorActionButton(
                text = stringResource(R.string.postpayment_operator_collect_card),
                onClick = onCollectCard,
                enabled = !requestActive,
            )
            OperatorActionButton(
                text = stringResource(R.string.postpayment_operator_collect_cash),
                onClick = onCollectCash,
                enabled = !requestActive,
                primary = false,
            )
            OperatorActionButton(
                text = stringResource(R.string.postpayment_operator_scan_another),
                onClick = onClear,
                enabled = !requestActive,
                destructive = true,
            )
        }
    }
}

@Composable
private fun OperatorPostPaymentCashConfirmDialog(
    amount: Double,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        OperatorPanel(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = stringResource(R.string.postpayment_operator_cash_confirm_title),
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
                    text = stringResource(R.string.postpayment_operator_collect_cash),
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
fun OperatorPostPaymentSuccess(
    terminalTitle: String,
    footerHint: String,
    completedTopUp: CompletedTopUp?,
    successMessage: String?,
    onDismiss: () -> Unit,
) {
    val message = successMessage ?: stringResource(R.string.postpayment_operator_open_next)

    OperatorScaffold(
        title = terminalTitle,
        subtitle = stringResource(R.string.postpayment_operator_subtitle),
        icon = Icons.Filled.CheckCircle,
        terminalLabel = stringResource(R.string.root_item_post_payment),
        footerHint = footerHint,
        footerSection = stringResource(R.string.root_item_post_payment),
        footerStatus = stringResource(R.string.operator_status_complete),
        showFooter = false,
        onBack = onDismiss,
        headerFlowTitle = stringResource(R.string.root_item_post_payment),
        headerTillLabel = terminalTitle,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                OperatorStatePanel(
                    title = stringResource(R.string.operator_status_complete),
                    message = message,
                    success = true,
                )
                if (completedTopUp != null) {
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
                            label = stringResource(R.string.operator_collected_total),
                            value = formatEuroAmount(completedTopUp.amount),
                            accent = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            },
            railContent = {
                OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = stringResource(R.string.postpayment_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        if (completedTopUp != null) {
                            OperatorRailSummaryRow(
                                label = stringResource(R.string.operator_updated_balance),
                                value = formatEuroAmount(completedTopUp.newBalance),
                                accent = true,
                            )
                        } else {
                            OperatorRailSummaryRow(
                                label = stringResource(R.string.operator_status_complete),
                                value = footerHint,
                            )
                        }
                        OperatorActionButton(
                            text = stringResource(R.string.postpayment_operator_open_next),
                            onClick = onDismiss,
                        )
                    }
                }
            },
        )
    }
}

@Composable
fun OperatorPostPaymentError(
    terminalTitle: String,
    footerHint: String,
    onDismiss: () -> Unit,
) {
    OperatorScaffold(
        title = terminalTitle,
        subtitle = stringResource(R.string.postpayment_operator_subtitle),
        icon = Icons.Filled.ErrorOutline,
        terminalLabel = stringResource(R.string.root_item_post_payment),
        footerHint = footerHint,
        footerSection = stringResource(R.string.root_item_post_payment),
        footerStatus = stringResource(R.string.operator_status_issue),
        showFooter = false,
        onBack = onDismiss,
        headerFlowTitle = stringResource(R.string.root_item_post_payment),
        headerTillLabel = terminalTitle,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = {
                OperatorStatePanel(
                    title = stringResource(R.string.operator_status_issue),
                    message = footerHint,
                    success = false,
                )
            },
            railContent = {
                OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = stringResource(R.string.postpayment_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.operator_status_issue),
                            value = footerHint,
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.postpayment_operator_scan_another),
                            onClick = onDismiss,
                            destructive = true,
                        )
                    }
                }
            },
        )
    }
}

private fun formatEuroAmount(amount: Double): String = "%.2f€".format(abs(amount))
