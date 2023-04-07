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
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

@Preview
@Composable
fun NfcDebugView(viewModel: NfcDebugViewModel = hiltViewModel()) {
    val state = rememberNfcDebugState(viewModel)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var scanViewUid by remember { mutableStateOf(0uL) }
    val scanState = rememberNfcScanDialogState()
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    NfcScanDialog(scanState, onScan = { scanViewUid = it })

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
                    viewModel.program()
                    state.stop()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Full Program")
        }

        Spacer(modifier = Modifier.height(16.dp))

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
                        viewModel.writeProtect(true)
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
                        viewModel.writeProtect(false)
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
                        viewModel.writeCmac(true)
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
                        viewModel.writeCmac(false)
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
            when (uiState.result) {
                is NfcDebugScanResult.None -> {}
                is NfcDebugScanResult.ReadSuccess -> {
                    Text("Protected: " +
                        when ((uiState.result as NfcDebugScanResult.ReadSuccess).protected) {
                            true -> "Yes"
                            else -> "No"
                        }
                    )
                    Text("UID: " + (uiState.result as NfcDebugScanResult.ReadSuccess).uid)
                    Text("Content:\n" + (uiState.result as NfcDebugScanResult.ReadSuccess).content)
                }
                is NfcDebugScanResult.WriteSuccess -> Text("Written")
                is NfcDebugScanResult.Failure -> {
                    when ((uiState.result as NfcDebugScanResult.Failure).reason) {
                        is NfcScanFailure.Other -> Text("Other failure")
                        is NfcScanFailure.Incompatible -> Text("Tag incompatible")
                        is NfcScanFailure.Lost -> Text("Tag lost")
                        is NfcScanFailure.Auth -> Text("Authentication failed")
                    }
                }
            }
        }
    }
}