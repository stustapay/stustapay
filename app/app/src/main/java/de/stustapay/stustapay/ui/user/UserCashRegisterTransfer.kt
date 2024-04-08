package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.ConfirmCard
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.libssp.ui.theme.MoneyAmountStyle
import de.stustapay.libssp.ui.theme.NfcScanStyle
import kotlinx.coroutines.launch


@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun UserCashRegisterTransferDialog(state: DialogDisplayState) {
    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            },
            // because of https://issuetracker.google.com/issues/221643630#comment9
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            UserCashRegisterTransfer(
                modifier = Modifier.padding(horizontal = 10.dp),
                onClose = {
                    state.close()
                }
            )
        }
    }
}


@Composable
fun UserCashRegisterTransfer(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: UserCashRegisterTransferViewModel = hiltViewModel()
) {
    val scope = rememberCoroutineScope()
    val transferCashRegisterState by viewModel.transferCashRegisterState.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.clear()
    }

    ConfirmCard(
        modifier = modifier,
        confirmEnabled = transferCashRegisterState is TransferCashRegisterState.Done,
        showBackButton = transferCashRegisterState !is TransferCashRegisterState.Done,
        onConfirm = {
            onClose()
        },
        onBack = {
            onClose()
        },
    ) {
        Column {
            Text(
                text = stringResource(R.string.transfer_cash_register),
                style = MaterialTheme.typography.h5,
            )

            when (val transferState = transferCashRegisterState) {
                is TransferCashRegisterState.ScanSource, is TransferCashRegisterState.ScanTarget -> {
                    NfcScanCard(
                        modifier = Modifier.padding(vertical = 10.dp),
                        onScan = { tag ->
                            scope.launch {
                                viewModel.tagScanned(tag)
                            }
                        },
                        keepScanning = true,
                        checkScan = { tag ->
                            viewModel.checkScan(tag)
                        }
                    ) {
                        // scan text for cashregister transfer
                        Text(
                            when (transferState) {
                                is TransferCashRegisterState.ScanSource -> {
                                    stringResource(R.string.scan_transfer_cashregister_current)
                                }

                                is TransferCashRegisterState.ScanTarget -> {
                                    stringResource(R.string.scan_transfer_cashregister_new)
                                }

                                else -> {
                                    "unreachable"
                                }
                            },
                            style = NfcScanStyle,
                        )
                    }
                }

                is TransferCashRegisterState.Error -> {
                    Column {
                        Text(
                            stringResource(R.string.cash_register_transfer_error),
                            style = MaterialTheme.typography.body1
                        )
                        Text(transferState.msg, style = MaterialTheme.typography.body1)
                    }
                }

                is TransferCashRegisterState.Done -> {
                    Text(
                        stringResource(R.string.cash_register_transfer_success),
                        style = MaterialTheme.typography.body1
                    )
                    Text(transferState.cashRegisterName, style = MaterialTheme.typography.h5)
                    Text("%.02f€".format(transferState.balance), style = MoneyAmountStyle)
                }
            }

            StatusText(status, scrollable = false)
        }
    }
}
