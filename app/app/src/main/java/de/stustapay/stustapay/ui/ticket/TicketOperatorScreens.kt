package de.stustapay.stustapay.ui.ticket

import android.app.Activity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.runtime.Composable
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
import de.stustapay.api.models.PaymentMethod
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPaymentLayoutProfile
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import de.stustapay.stustapay.ui.common.pay.NoCashRegisterWarning
import de.stustapay.stustapay.ui.common.pay.ProductConfirmLineItem
import de.stustapay.libssp.ui.theme.NfcScanStyle
import kotlinx.coroutines.launch

@Composable
fun OperatorTicketScan(
    leaveView: () -> Unit,
    viewModel: TicketViewModel,
) {
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val ticketStatus by viewModel.ticketDraft.collectAsStateWithLifecycle()
    val tagScanStatus by viewModel.tagScanStatus.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    OperatorScaffold(
        title = config.title().title,
        subtitle = stringResource(R.string.ticket_operator_subtitle),
        icon = Icons.Filled.ConfirmationNumber,
        terminalLabel = stringResource(R.string.tickets),
        footerHint = status,
        footerSection = stringResource(R.string.tickets),
        footerStatus = "${ticketStatus.scans.size}",
        showFooter = false,
        onBack = leaveView,
        headerFlowTitle = stringResource(R.string.tickets),
        headerTillLabel = config.title().title,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                if (!config.canHandleCash()) {
                    NoCashRegisterWarning(modifier = Modifier.padding(top = 4.dp))
                }

                OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                    NfcScanCard(
                        modifier = Modifier.fillMaxWidth(),
                        border = when (tagScanStatus) {
                            is TagScanStatus.Duplicate -> BorderStroke(2.dp, MaterialTheme.colors.error)
                            else -> BorderStroke(2.dp, OperatorPalette.panelBorder)
                        },
                        backgroundColor = OperatorPalette.panelMuted,
                        checkScan = viewModel::checkTagScan,
                        onScan = { uid ->
                            scope.launch {
                                viewModel.tagScanned(uid)
                            }
                        },
                        scan = tagScanStatus !is TagScanStatus.NoScan,
                        keepScanning = true,
                    ) {
                        val scanText = when (tagScanStatus) {
                            is TagScanStatus.Scan -> stringResource(R.string.scan_ticket)
                            is TagScanStatus.Duplicate -> stringResource(R.string.duplicate_ticket_scan)
                            is TagScanStatus.NoScan -> stringResource(R.string.ticket_scanning_off)
                        }

                        PencilOperatorScanContent(
                            title = scanText,
                            subtitle = stringResource(R.string.nfc_scan_description),
                            scanStatus = status,
                            showStatusPanel = false,
                        )
                    }
                }

                OperatorPanel(
                    modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
                    backgroundColor = OperatorPalette.panelMuted,
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(ticketStatus.scans, key = { listOf(it.tag.uid, it.ticket.id) }) { scannedTicket ->
                            OperatorTicketScanItem(scannedTicket)
                        }
                    }
                }
            },
            railContent = { profile ->
                OperatorPanel(
                    modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
                    backgroundColor = OperatorPalette.panelMuted,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
                        Text(
                            text = stringResource(R.string.ticket_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.tickets),
                            value = ticketStatus.scans.size.toString(),
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.ticket_operator_validate),
                            onClick = {
                                scope.launch {
                                    viewModel.checkSale()
                                }
                            },
                            enabled = config.isTerminalReady() && ticketStatus.scans.isNotEmpty() && !requestActive,
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.ticket_operator_clear),
                            onClick = { viewModel.clearDraft() },
                            enabled = ticketStatus.scans.isNotEmpty() && !requestActive,
                            destructive = true,
                        )
                    }
                }
            },
        )
    }
}

@Composable
fun OperatorTicketConfirm(
    goBack: () -> Unit,
    viewModel: TicketViewModel,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val ticketDraft by viewModel.ticketDraft.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = androidx.activity.compose.LocalActivity.current as Activity
    var showCashConfirm by remember { mutableStateOf(false) }

    val checkedSale = ticketDraft.pendingSale ?: run {
        Column {
            Text(status)
            Text(stringResource(R.string.ticket_no_sale_check_present))
        }
        return
    }

    if (showCashConfirm) {
        TicketCashConfirmDialog(
            amount = checkedSale.totalPrice,
            onDismiss = { showCashConfirm = false },
            onConfirm = {
                showCashConfirm = false
                scope.launch {
                    viewModel.processSale(
                        context = context,
                        paymentMethod = PaymentMethod.cash,
                    )
                }
            },
        )
    }

    OperatorScaffold(
        title = config.title().title,
        subtitle = stringResource(R.string.ticket_confirm_subtitle),
        icon = Icons.Filled.ConfirmationNumber,
        terminalLabel = stringResource(R.string.ticket_terminal_confirm),
        footerHint = status,
        footerSection = stringResource(R.string.tickets),
        footerStatus = stringResource(R.string.operator_status_ready),
        showFooter = false,
        onBack = goBack,
        headerFlowTitle = stringResource(R.string.tickets),
        headerTillLabel = config.title().title,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                OperatorPanel(
                    modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
                    backgroundColor = OperatorPalette.panelMuted,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OperatorMetricCard(
                            label = stringResource(R.string.tickets),
                            value = checkedSale.scannedTickets.size.toString(),
                        )
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            itemsIndexed(
                                checkedSale.lineItems,
                                key = { index, lineItem ->
                                    "${lineItem.product.id}-${lineItem.taxRateId}-${lineItem.productPrice}-${lineItem.quantity}-$index"
                                },
                            ) { _, lineItem ->
                                ProductConfirmLineItem(lineItem = lineItem)
                            }
                        }
                    }
                }
            },
            railContent = { profile ->
                OperatorPanel(
                    modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
                    backgroundColor = OperatorPalette.panelMuted,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
                        Text(
                            text = stringResource(R.string.ticket_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.price),
                            value = "%.2f€".format(checkedSale.totalPrice),
                            accent = true,
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.pay_card).replace("\n", " "),
                            onClick = {
                                scope.launch {
                                    viewModel.processSale(
                                        context = context,
                                        paymentMethod = PaymentMethod.sumup,
                                    )
                                }
                            },
                            enabled = config.isTerminalReady() && !requestActive,
                        )
                        if (config.canHandleCash()) {
                            OperatorActionButton(
                                text = stringResource(R.string.pay_cash).replace("\n", " "),
                                onClick = { showCashConfirm = true },
                                enabled = config.isTerminalReady() && !requestActive,
                                primary = false,
                            )
                        }
                        OperatorActionButton(
                            text = stringResource(R.string.arrow_back),
                            onClick = goBack,
                            enabled = !requestActive,
                            destructive = true,
                        )
                    }
                }
            },
        )
    }
}

@Composable
fun OperatorTicketSuccess(
    terminalTitle: String,
    footerHint: String,
    completedSale: de.stustapay.api.models.CompletedTicketSale,
    onConfirm: () -> Unit,
) {
    OperatorScaffold(
        title = terminalTitle,
        subtitle = stringResource(R.string.ticket_success_subtitle),
        icon = Icons.Filled.CheckCircle,
        terminalLabel = stringResource(R.string.tickets),
        footerHint = footerHint,
        footerSection = stringResource(R.string.tickets),
        footerStatus = stringResource(R.string.operator_status_complete),
        showFooter = false,
        onBack = onConfirm,
        headerFlowTitle = stringResource(R.string.tickets),
        headerTillLabel = terminalTitle,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                OperatorStatePanel(
                    title = stringResource(R.string.ticket_order_booked),
                    message = footerHint,
                    success = true,
                )
                Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
                    OperatorMetricCard(
                        label = stringResource(R.string.price),
                        value = "%.2f€".format(completedSale.totalPrice),
                        accent = true,
                    )
                    OperatorMetricCard(
                        label = stringResource(R.string.tickets),
                        value = completedSale.scannedTickets.size.toString(),
                    )
                }
            },
            railContent = {
                OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.tickets),
                            value = completedSale.scannedTickets.size.toString(),
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.ticket_operator_open_next),
                            onClick = onConfirm,
                        )
                    }
                }
            },
        )
    }
}

@Composable
fun OperatorTicketError(
    terminalTitle: String,
    footerHint: String,
    onDismiss: () -> Unit,
) {
    OperatorScaffold(
        title = terminalTitle,
        subtitle = stringResource(R.string.ticket_error_subtitle),
        icon = Icons.Filled.ErrorOutline,
        terminalLabel = stringResource(R.string.tickets),
        footerHint = footerHint,
        footerSection = stringResource(R.string.tickets),
        footerStatus = stringResource(R.string.operator_status_issue),
        showFooter = false,
        onBack = onDismiss,
        headerFlowTitle = stringResource(R.string.tickets),
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
                            text = stringResource(R.string.ticket_operator_summary_title),
                            color = OperatorPalette.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.ticket_operator_clear),
                            onClick = onDismiss,
                            destructive = true,
                        )
                    }
                }
            },
        )
    }
}

@Composable
private fun OperatorTicketScanItem(scannedTicket: ScannedTicket) {
    OperatorPanel(
        modifier = Modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panel,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = scannedTicket.ticket.name,
                color = OperatorPalette.title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = scannedTicket.tag.uidHex(),
                color = OperatorPalette.subtitle,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = "%.2f€".format(scannedTicket.ticket.price),
                color = OperatorPalette.accent,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold,
            )
        }
    }
}

@Composable
private fun TicketCashConfirmDialog(
    amount: Double,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        OperatorPanel(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = stringResource(R.string.received_q),
                    color = OperatorPalette.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                OperatorRailSummaryRow(
                    label = stringResource(R.string.price),
                    value = "%.2f€".format(amount),
                    accent = true,
                )
                OperatorActionButton(
                    text = stringResource(R.string.pay_cash).replace("\n", " "),
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
