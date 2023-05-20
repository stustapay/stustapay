package de.stustanet.stustapay.ui.ticket

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.Icon
import androidx.compose.material.ListItem
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanCard
import de.stustanet.stustapay.ui.common.pay.ProductSelectionBottomBar
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun TicketScan(
    leaveView: () -> Unit,
    viewModel: TicketViewModel
) {

    val ticketConfig by viewModel.ticketConfig.collectAsStateWithLifecycle()
    val ticketStatus by viewModel.ticketDraft.collectAsStateWithLifecycle()
    val tagScanStatus by viewModel.tagScanStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(ticketConfig.tillName) },
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                    leaveView()
                },
            )
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp)
                    .padding(bottom = paddingValues.calculateBottomPadding()),
            ) {
                item {
                    NfcScanCard(
                        modifier = Modifier
                            .padding(horizontal = 20.dp, vertical = 20.dp)
                            .fillMaxWidth(),
                        border = when (tagScanStatus) {
                            is TagScanStatus.Duplicate -> {
                                BorderStroke(2.dp, MaterialTheme.colors.error)
                            }

                            else -> {
                                null
                            }
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
                            is TagScanStatus.Scan -> {
                                // TICKET
                                "\uD83C\uDFAB Scan Ticket"
                            }

                            is TagScanStatus.Duplicate -> {
                                "Already scanned! Scan new ticket!"
                            }

                            is TagScanStatus.NoScan -> {
                                "Not scanning."
                            }
                        }

                        Text(
                            text = scanText,
                            textAlign = TextAlign.Center,
                            fontSize = 40.sp
                        )
                    }
                }

                for (scannedTicket in ticketStatus.scans) {
                    item {
                        // todo: show price
                        ListItem(
                            text = { Text(scannedTicket.ticket.name) },
                            secondaryText = { Text(scannedTicket.tag.toString()) },
                            icon = {
                                Icon(
                                    Icons.Filled.DateRange,
                                    contentDescription = null,
                                    modifier = Modifier.size(40.dp)
                                )
                            }
                        )
                    }
                }
            }
        },
        bottomBar = {
            ProductSelectionBottomBar(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp),
                status = {
                    Text(
                        text = status,
                        modifier = Modifier.fillMaxWidth(),
                        fontSize = 18.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                },
                ready = ticketConfig.ready,
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
    )
}