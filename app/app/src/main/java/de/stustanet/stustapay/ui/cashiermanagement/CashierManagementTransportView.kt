package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.amountselect.AmountSelection
import kotlinx.coroutines.launch

@Composable
fun CashierManagementTransportView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf(0u) }
    val scanState = rememberNfcScanDialogState()
    var bookingType by remember { mutableStateOf(TransportBookingType.Withdraw) }
    val status by viewModel.status.collectAsStateWithLifecycle()

    NfcScanDialog(state = scanState, onScan = { tag ->
        when (bookingType) {
            TransportBookingType.Withdraw -> {
                scope.launch {
                    viewModel.bookCashierToBag(tag.uid, amount.toDouble() / 100.0)
                }
            }
            TransportBookingType.Deposit -> {
                scope.launch {
                    viewModel.bookBagToCashier(tag.uid, amount.toDouble() / 100.0)
                }
            }
        }
    })

    Scaffold(
        content = {
            Box(modifier = Modifier.padding(it)) {
                AmountSelection(
                    config = AmountConfig.Money(),
                    onAmountUpdate = { newAmount -> amount = newAmount },
                    onClear = { amount = 0u },
                )
            }
        },
        bottomBar = {
            Column {
                Spacer(modifier = Modifier.height(10.dp))
                Divider()
                Spacer(modifier = Modifier.height(10.dp))
                Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                    if (status is CashierManagementStatus.Done) {
                        when (val res = (status as CashierManagementStatus.Done).res) {
                            is Response.OK -> {
                                Text(stringResource(R.string.common_status_done), fontSize = 24.sp)
                            }

                            is Response.Error -> {
                                Text(res.msg(), fontSize = 24.sp)
                            }
                        }
                    } else {
                        Text(stringResource(R.string.common_status_idle), fontSize = 24.sp)
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = {
                            bookingType = TransportBookingType.Withdraw
                            scanState.open()
                        }, modifier = Modifier
                            .weight(1.0f)
                            .padding(5.dp)
                            .height(80.dp)
                    ) {
                        Text(
                            stringResource(R.string.management_transport_withdraw),
                            fontSize = 20.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    Button(
                        onClick = {
                            bookingType = TransportBookingType.Deposit
                            scanState.open()
                        }, modifier = Modifier
                            .weight(1.0f)
                            .padding(5.dp)
                            .height(80.dp)
                    ) {
                        Text(
                            stringResource(R.string.management_transport_deposit),
                            fontSize = 20.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    )
}

enum class TransportBookingType {
    Withdraw,
    Deposit
}