package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.priceselect.PriceSelection
import kotlinx.coroutines.launch

@Composable
fun CashierManagementTransportView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf(0u) }
    val scanState = rememberNfcScanDialogState()
    var bookingType by remember { mutableStateOf(TransportBookingType.Withdraw) }

    NfcScanDialog(state = scanState, onScan =  { tag ->
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

    Column {
        PriceSelection(onEnter = { amount = it }, onClear = { amount = 0u })

        Spacer(modifier = Modifier.height(20.dp))
        Divider()
        Spacer(modifier = Modifier.height(20.dp))

        Row(modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = {
                    bookingType = TransportBookingType.Withdraw
                    scanState.open()
                }, modifier = Modifier
                    .weight(1.0f)
                    .padding(5.dp)
                    .height(140.dp)
            ) {
                Text("Withdraw\nCashier -> Bag", fontSize = 24.sp, textAlign = TextAlign.Center)
            }

            Button(
                onClick = {
                    bookingType = TransportBookingType.Deposit
                    scanState.open()
                }, modifier = Modifier
                    .weight(1.0f)
                    .padding(5.dp)
                    .height(140.dp)
            ) {
                Text("Deposit\nBag -> Cashier", fontSize = 24.sp, textAlign = TextAlign.Center)
            }
        }
    }
}

enum class TransportBookingType {
    Withdraw,
    Deposit
}