package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.priceselect.PriceSelection
import kotlinx.coroutines.launch

@Composable
fun CashierManagementVaultView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf(0u) }
    val scanState = rememberNfcScanDialogState()
    var bookingType by remember { mutableStateOf(VaultBookingType.Take) }
    val status by viewModel.status.collectAsStateWithLifecycle()

    NfcScanDialog(state = scanState, onScan =  { tag ->
        when (bookingType) {
            VaultBookingType.Take -> {
                scope.launch {
                    viewModel.bookVaultToBag(tag.uid, amount.toDouble() / 100.0)
                }
            }
            VaultBookingType.Return -> {
                scope.launch {
                    viewModel.bookBagToVault(tag.uid, amount.toDouble() / 100.0)
                }
            }
        }
    })

    Scaffold(
        content = {
            Box(modifier = Modifier.padding(it)) {
                PriceSelection(onEnter = { amount = it }, onClear = { amount = 0u })
            }
        },
        bottomBar = {
            Column {
                Spacer(modifier = Modifier.height(20.dp))
                Divider()
                Spacer(modifier = Modifier.height(20.dp))
                Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                    Text(status, fontSize = 24.sp)
                }
                Spacer(modifier = Modifier.height(20.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = {
                            bookingType = VaultBookingType.Take
                            scanState.open()
                        }, modifier = Modifier
                            .weight(1.0f)
                            .padding(5.dp)
                            .height(140.dp)
                    ) {
                        Text("Take\nVault -> Bag", fontSize = 24.sp, textAlign = TextAlign.Center)
                    }

                    Button(
                        onClick = {
                            bookingType = VaultBookingType.Return
                            scanState.open()
                        }, modifier = Modifier
                            .weight(1.0f)
                            .padding(5.dp)
                            .height(140.dp)
                    ) {
                        Text("Return\nBag -> Vault", fontSize = 24.sp, textAlign = TextAlign.Center)
                    }
                }
            }
        }
    )
}

enum class VaultBookingType {
    Take,
    Return
}