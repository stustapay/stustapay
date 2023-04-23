package de.stustanet.stustapay.ui.status

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState

@Preview
@Composable
fun CustomerStatusView(viewModel: CustomerStatusViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()

    NfcScanDialog(scanState) { tag ->
        viewModel.completeScan(tag.uid)
    }

    LaunchedEffect(scanState) {
        viewModel.startScan()
        scanState.open()
    }

    Scaffold(
        content = {
            Box(modifier = Modifier.padding(it)) {
                Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
                    when (uiState.state) {
                        is CustomerStatusRequestState.Fetching -> {
                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Fetching status...", fontSize = 48.sp)
                            }
                        }
                        is CustomerStatusRequestState.Done -> {
                            val customer = (uiState.state as CustomerStatusRequestState.Done).customer

                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("ID", fontSize = 48.sp)
                                Text(customer.id.toString(), fontSize = 24.sp)
                            }

                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Name", fontSize = 48.sp)
                                Text(customer.name, fontSize = 24.sp)
                            }

                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Cash", fontSize = 48.sp)
                                Text("${customer.balance}€", fontSize = 24.sp)
                            }

                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Coupons", fontSize = 48.sp)
                                Text(customer.vouchers.toString(), fontSize = 24.sp)
                            }

                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Comment", fontSize = 48.sp)
                            }

                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(customer.comment, fontSize = 24.sp)
                            }
                        }
                        is CustomerStatusRequestState.Failed -> {
                            Row (
                                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Failed to fetch status", fontSize = 48.sp)
                            }
                        }
                    }
                }
            }
        },
        bottomBar = {
            Button(
                modifier = Modifier.fillMaxWidth().padding(10.dp),
                onClick = {
                    viewModel.startScan()
                    scanState.open()
                }
            ) {
                Text("Scan", fontSize = 24.sp)
            }
        }
    )
}
