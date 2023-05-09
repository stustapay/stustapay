package de.stustanet.stustapay.ui.ticket

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
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
import androidx.compose.material.icons.filled.Star
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.pay.ProductSelectionBottomBar
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun TicketScanning(
    goBack: () -> Unit,
    viewModel: TicketViewModel
) {
    val ticketConfig by viewModel.ticketConfig.collectAsStateWithLifecycle()
    val ticketDraft by viewModel.ticketDraft.collectAsStateWithLifecycle()
    val tagScanStatus by viewModel.tagScanStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val scanState = rememberNfcScanDialogState()

    LaunchedEffect(tagScanStatus) {
        when (tagScanStatus) {
            is TagScanStatus.Scan, is TagScanStatus.ScanNext, is TagScanStatus.Duplicate -> {
                scanState.open()
            }

            is TagScanStatus.NoScan -> {
                scanState.close()
            }
        }
    }

    NfcScanDialog(
        modifier = Modifier.size(400.dp, 450.dp),
        state = scanState,
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
        onDismiss = {
            viewModel.tagScanDismissed()
        }
    ) {
        Column {
            val scanText = when (val tagScanStatusV = tagScanStatus) {
                is TagScanStatus.Scan -> {
                    if (tagScanStatusV.wanted == 1) {
                        "\uD83D\uDCE1 Scan Ticket"
                    } else {
                        "Scan Ticket %3d/%d".format(tagScanStatusV.step, tagScanStatusV.wanted)
                    }
                }

                is TagScanStatus.ScanNext -> {
                    "Ok! Scan next ticket %3d/%d".format(
                        tagScanStatusV.step,
                        tagScanStatusV.wanted
                    )
                }

                is TagScanStatus.Duplicate -> {
                    "Already scanned! Scan ticket %3d/%d".format(
                        tagScanStatusV.step,
                        tagScanStatusV.wanted
                    )
                }

                is TagScanStatus.NoScan -> {
                    ""
                }
            }

            Text(
                text = scanText,
                textAlign = TextAlign.Center,
                fontSize = 40.sp
            )
        }
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text(ticketConfig.tillName) },
                    icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                        goBack()
                    },
                )

                Text(
                    text = "%3d/%d Scanned Tags".format(
                        ticketDraft.tagsScanned(),
                        ticketDraft.tagScansRequired(),
                    ),
                    fontSize = 24.sp,
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 10.dp)
                )
            }
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp)
                    .padding(bottom = paddingValues.calculateBottomPadding()),
            ) {
                for (scannedTicket in ticketDraft.tags) {
                    item {
                        ListItem(
                            text = { Text(scannedTicket.uid.toString(16).uppercase()) },
                            icon = {
                                Icon(
                                    Icons.Filled.Star,
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
                abortText = "↢ Edit",
                abortSize = 30.sp,
                submitText = if (!ticketDraft.allTagsScanned()) {
                    "Scan Tags"
                } else {
                    "Submit"
                },
                submitSize = 30.sp,
                status = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = status,
                            modifier = Modifier.fillMaxWidth(),
                            fontSize = 18.sp,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                },
                ready = ticketConfig.ready,
                onAbort = goBack,
                onSubmit = {
                    scope.launch {
                        viewModel.continueScan()
                    }
                },
            )
        }
    )
}