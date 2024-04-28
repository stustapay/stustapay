package de.stustapay.chip_debug.ui.test

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.chip_debug.ui.chipscan.NfcScanDialog
import de.stustapay.chip_debug.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.libssp.model.NfcTag
import kotlinx.coroutines.launch

@Preview
@Composable
fun NfcDebugView(viewModel: NfcDebugViewModel = hiltViewModel()) {
    val state = rememberNfcDebugState(viewModel)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var scanViewTag by remember { mutableStateOf(NfcTag(BigInteger(0), null)) }
    val scanState = rememberNfcScanDialogState()
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    NfcScanDialog(state = scanState, onScan = { scanViewTag = it })

    if (state.isScanning()) {
        Dialog(onDismissRequest = {
            state.stop()
        }) {
            Box(Modifier.size(300.dp, 300.dp)) {
                Card(modifier = Modifier.padding(20.dp)) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center
                        ) {
                            Text("Scan a Chip!", textAlign = TextAlign.Center, fontSize = 48.sp)
                        }
                    }
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .padding(16.dp)
            .fillMaxSize()
            .verticalScroll(state = scrollState)
    ) {
        Text(text = "Scan View", fontSize = 24.sp)

        Button(
            onClick = { scanState.open() }, modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open Scan View")
        }

        val tag = scanViewTag
        Text("UID: ${tag.uid.toString(16)}")
        Text("PIN: ${tag.pin}")

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Actions", fontSize = 24.sp)

        Button(
            onClick = {
                scope.launch {
                    state.start()
                    viewModel.write()
                    state.stop()
                }
            }, modifier = Modifier.fillMaxWidth()
        ) {
            Text("Write")
        }

        Button(
            onClick = {
                scope.launch {
                    state.start()
                    viewModel.test()
                    state.stop()
                }
            }, modifier = Modifier.fillMaxWidth()
        ) {
            Text("Production Test")
        }

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Results", fontSize = 24.sp)

        Column(
            horizontalAlignment = Alignment.Start, modifier = Modifier.fillMaxWidth()
        ) {
            when (val result = uiState.result) {
                is NfcDebugScanResult.None -> {}
                is NfcDebugScanResult.ReadSuccess -> {
                    Text("UID: ${result.tag.uid.toString(16)}")
                }

                is NfcDebugScanResult.WriteSuccess -> Text("Written")
                is NfcDebugScanResult.Failure -> {
                    when (val reason = result.reason) {
                        is NfcScanFailure.NoKey -> Text("no secret key present")
                        is NfcScanFailure.Other -> Text("Failure: ${reason.msg}")
                        is NfcScanFailure.Incompatible -> Text("Tag incompatible")
                        is NfcScanFailure.Lost -> Text("Tag lost")
                        is NfcScanFailure.Auth -> Text("Authentication failed")
                    }
                }

                is NfcDebugScanResult.Test -> {
                    for (line in result.log) {
                        if (line.second) {
                            Text(line.first, color = Color.Green)
                        } else {
                            Text(line.first, color = Color.Red)
                        }
                    }
                }
            }
        }
    }
}
