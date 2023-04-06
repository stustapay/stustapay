package de.stustanet.stustapay.ui.debug

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberChipScanState
import kotlinx.coroutines.launch

@Preview
@Composable
fun NfcDebugView(viewModel: NfcDebugViewModel = hiltViewModel()) {
    val state = rememberNfcDebugState(viewModel)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var scanViewUid by remember { mutableStateOf(0uL) }
    val scanState = rememberChipScanState()
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    ChipScanDialog(scanState, onScan = { scanViewUid = it })

    if (state.isScanning()) {
        Dialog(
            onDismissRequest = {
                state.stop()
            }
        ) {
            Box(Modifier.size(300.dp, 300.dp)) {
                Card(modifier = Modifier.padding(20.dp)) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Scan a Chip!", textAlign = TextAlign.Center, fontSize = 48.sp)
                        }
                    }
                }
            }
        }
    }

    Column(modifier = Modifier
        .padding(16.dp)
        .fillMaxSize()
        .verticalScroll(state = scrollState)
    ) {
        Text(text = "Scan View", fontSize = 24.sp)

        Button(
            onClick = { scanState.open() },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open Scan View")
        }

        val uid = scanViewUid
        Text("UID: $uid")

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Settings", fontSize = 24.sp)

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Switch(checked = uiState.enableDebugCard, onCheckedChange = { viewModel.setDebugCard(it) })
            Text("Enable Debug Chip")
        }

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Switch(checked = uiState.enableAuth, onCheckedChange = { viewModel.setAuth(it) })
            Text("Enable Authentication")
        }

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Switch(checked = uiState.enableCmac, onCheckedChange = { viewModel.setCmac(it) })
            Text("Enable CMAC")
        }

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Actions", fontSize = 24.sp)

        Button(
            onClick = {
                scope.launch {
                    state.start()
                    viewModel.read()
                    state.stop()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Read")
        }

        Button(
            onClick = {
                scope.launch {
                    state.start()
                    viewModel.writeSig()
                    state.stop()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Write Signature")
        }

        Button(
            onClick = {
                scope.launch {
                    state.start()
                    viewModel.writeKey()
                    state.stop()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Write Key")
        }

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = {
                    scope.launch {
                        state.start()
                        viewModel.writeProtectOn()
                        state.stop()
                    }
                },
                modifier = Modifier.fillMaxWidth(0.5f).padding(end = 5.dp)
            ) {
                Text("Enable Protection")
            }
            Button(
                onClick = {
                    scope.launch {
                        state.start()
                        viewModel.writeProtectOff()
                        state.stop()
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(start = 5.dp)
            ) {
                Text("Disable Protection")
            }
        }

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = {
                    scope.launch {
                        state.start()
                        viewModel.writeCmacOn()
                        state.stop()
                    }
                },
                modifier = Modifier.fillMaxWidth(0.5f).padding(end = 5.dp)
            ) {
                Text("Enable CMAC")
            }
            Button(
                onClick = {
                    scope.launch {
                        state.start()
                        viewModel.writeCmacOff()
                        state.stop()
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(start = 5.dp)
            ) {
                Text("Disable CMAC")
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Results", fontSize = 24.sp)

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Compatible: " +
                when (uiState.compatible) {
                    null -> "Unknown"
                    true -> "Yes"
                    else -> "No"
                }
            )

            Text("Authenticated: " +
                when (uiState.authenticated) {
                    null -> "Unknown"
                    true -> "Yes"
                    else -> "No"
                }
            )

            Text("Protected: " +
                when (uiState.protected) {
                    null -> "Unknown"
                    true -> "Yes"
                    else -> "No"
                }
            )

            Text("UID: " +
                when (uiState.uid) {
                    null -> "Unknown"
                    else -> uiState.uid!!
                }
            )

            Text("Content:\n" +
                when (uiState.content) {
                    null -> "Unknown"
                    else -> uiState.content!!
                }
            )
        }
    }
}
