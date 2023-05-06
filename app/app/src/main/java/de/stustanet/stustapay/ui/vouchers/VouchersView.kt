package de.stustanet.stustapay.ui.vouchers

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.cashiermanagement.VaultBookingType
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.NumberKeyboard
import kotlinx.coroutines.launch

const val MAX_VOUCHERS = 100

@Composable
fun VouchersView(viewModel: VouchersViewModel = hiltViewModel()) {
    val scope = rememberCoroutineScope()
    val scanState = rememberNfcScanDialogState()
    var vouchers by remember { mutableStateOf(0) }
    val statusText by viewModel.status.collectAsStateWithLifecycle()

    NfcScanDialog(state = scanState, onScan = { tag ->
        scope.launch {
            viewModel.giveVouchers(tag.uid, vouchers)
            vouchers = 0
        }
    })

    Scaffold(
        content = {
            Box(modifier = Modifier.padding(it)) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp)
                ) {
                    Text(
                        "$vouchers",
                        fontSize = 96.sp,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )

                    NumberKeyboard(onDigitEntered = { digit ->
                        if (vouchers * 10 < MAX_VOUCHERS) {
                            vouchers = vouchers * 10 + digit.toInt()
                        }
                    }, onClear = {
                        vouchers = 0
                    })
                }
            }
        },
        bottomBar = {
            Column {
                Spacer(modifier = Modifier.height(20.dp))
                Divider()
                Spacer(modifier = Modifier.height(20.dp))
                Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                    Text(statusText, fontSize = 24.sp)
                }
                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    onClick = {
                        if (vouchers in 1 until MAX_VOUCHERS) {
                            scanState.open()
                        }
                    }
                ) {
                    Text("Grant Vouchers", fontSize = 24.sp)
                }
            }
        }
    )
}