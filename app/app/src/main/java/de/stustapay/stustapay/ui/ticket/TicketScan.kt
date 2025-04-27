package de.stustapay.stustapay.ui.ticket

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.libssp.ui.theme.NfcScanStyle
import de.stustapay.stustapay.R
import de.stustapay.libssp.ui.barcode.QRScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelectionDialog
import de.stustapay.stustapay.ui.common.pay.NoCashRegisterWarning
import de.stustapay.stustapay.ui.common.pay.ProductConfirmBottomBar
import de.stustapay.stustapay.ui.nav.TopAppBar
import de.stustapay.stustapay.ui.nav.TopAppBarIcon
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
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

    val editTicketTopUpAmount = rememberDialogDisplayState()
    val ticketTargetTag = remember { MutableStateFlow<NfcTag?>(null) }

    AmountSelectionDialog(
        state = editTicketTopUpAmount,

        config = AmountConfig.Money(cents = false, limit = 150u),
        initialAmount = {
            viewModel.getTagTopUp(ticketTargetTag.value)
        },
        onEnter = { amount ->
            scope.launch {
                viewModel.setTagTopUp(ticketTargetTag.value, amount)
            }
        },
        onClear = {
            scope.launch {
                viewModel.setTagTopUp(ticketTargetTag.value, 0u)
            }
        },
    )

    val scanTicketVoucherState = rememberDialogDisplayState()
    QRScanDialog(
        state = scanTicketVoucherState,
        onScan = { scanned ->
            scope.launch {
                viewModel.setTagTicketVoucherToken(ticketTargetTag.value, scanned)
            }
        }
    ) {
        Text(stringResource(R.string.ticket_scan_voucher))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(config.title().title) },
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
                    if (!config.canHandleCash()) {
                        NoCashRegisterWarning(modifier = Modifier.padding(top = 8.dp))
                    }
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
                                stringResource(R.string.ticket_scan)
                            }

                            is TagScanStatus.Duplicate -> {
                                stringResource(R.string.ticket_error_duplicate)
                            }

                            is TagScanStatus.NoScan -> {
                                stringResource(R.string.ticket_scanning_off)
                            }
                        }

                        Text(
                            text = scanText,
                            style = NfcScanStyle,
                        )
                    }
                }

                for (scan in ticketStatus.tickets) {
                    item {
                        TicketListItem(
                            scan,
                            setTopUp = if (config.allowTopUp()) {
                                {
                                    ticketTargetTag.update { scan.nfcTag }
                                    editTicketTopUpAmount.open()
                                }
                            } else {
                                null
                            },
                            setTicketVoucher = if (config.canScanTicketVouchers()) {
                                {
                                    ticketTargetTag.update { scan.nfcTag }
                                    scanTicketVoucherState.open()
                                }
                            } else {
                                null
                            },
                        )
                    }
                }
            }
        },
        bottomBar = {
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
    )
}
