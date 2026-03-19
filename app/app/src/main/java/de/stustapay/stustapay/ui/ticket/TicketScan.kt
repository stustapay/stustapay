package de.stustapay.stustapay.ui.ticket

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.pay.NoCashRegisterWarning
import de.stustapay.stustapay.ui.common.pay.ProductSelectionBottomBar
import de.stustapay.libssp.ui.theme.NfcScanStyle
import de.stustapay.stustapay.ui.common.pay.ProductConfirmBottomBar
import kotlinx.coroutines.launch

@Composable
fun TicketScan(
    leaveView: () -> Unit,
    viewModel: TicketViewModel
) {

    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val ticketStatus by viewModel.ticketDraft.collectAsStateWithLifecycle()
    val tagScanStatus by viewModel.tagScanStatus.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    OperatorScaffold(
        title = config.title().title,
        subtitle = "Scan ticket tags and build the draft before confirming payment.",
        icon = Icons.Filled.ConfirmationNumber,
        terminalLabel = "Ticket",
        footerHint = status,
        footerSection = "Tickets",
        footerStatus = "${ticketStatus.scans.size} scanned",
        onBack = leaveView,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
            ) {
                item {
                    if (!config.canHandleCash()) {
                        NoCashRegisterWarning(modifier = Modifier.padding(top = 8.dp))
                    }
                    NfcScanCard(
                        modifier = Modifier
                            .padding(horizontal = 20.dp, vertical = 20.dp)
                            .fillMaxWidth(),
                        border = when (tagScanStatus) {
                            is TagScanStatus.Duplicate -> BorderStroke(2.dp, MaterialTheme.colors.error)
                            else -> null
                        },
                        checkScan = { uid ->
                            viewModel.checkTagScan(uid)
                        },
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

                        Text(
                            text = scanText,
                            style = NfcScanStyle,
                        )
                    }
                }

                for (scannedTicket in ticketStatus.scans) {
                    item {
                        TicketListItem(scannedTicket)
                    }
                }
            }

            ProductConfirmBottomBar(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp),
                status = {
                    StatusText(status)
                },
                ready = config.isTerminalReady() && ticketStatus.scans.isNotEmpty() && !requestActive,
                onAbort = {
                    scope.launch {
                        viewModel.clearDraft()
                    }
                },
                onSubmit = {
                    scope.launch {
                        viewModel.checkSale()
                    }
                },
            )
        }
    }
}
