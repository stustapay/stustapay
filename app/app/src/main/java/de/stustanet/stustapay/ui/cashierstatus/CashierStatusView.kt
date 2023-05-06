package de.stustanet.stustapay.ui.cashierstatus

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Composable
fun CashierStatusView(
    viewModel: CashierStatusViewModel = hiltViewModel(),
    leaveView: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()

    LaunchedEffect(null) {
        viewModel.fetchLocal()
    }

    NfcScanDialog(state = scanState, onScan = { tag ->
        scope.launch {
            viewModel.fetchTag(tag.uid)
        }
    })

    NavScaffold(
        navigateBack = leaveView,
        title = { Text("Cashier Status") }
    ) {
        Box(modifier = Modifier.padding(it)) {
            Scaffold(
                content = {
                    Box(modifier = Modifier.padding(it)) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(10.dp)
                        ) {
                            when (uiState.state) {
                                is CashierStatusRequestState.Fetching -> {
                                    Text("Fetching", fontSize = 48.sp)
                                }
                            }
                        }
                    }
                },
                bottomBar = {
                    Button(
                        onClick = {
                            scanState.open()
                        }, modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp)
                    ) {
                        Text("Scan", fontSize = 24.sp)
                    }
                }
            )
        }
    }
}