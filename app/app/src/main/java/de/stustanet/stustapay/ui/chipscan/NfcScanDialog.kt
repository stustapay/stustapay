package de.stustanet.stustapay.ui.chipscan

import androidx.compose.foundation.layout.*
import androidx.compose.material.Card
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun NfcScanDialog(
    state: NfcScanDialogState,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    text: String = "Scan a Chip!",
    onScan: (ULong) -> Unit = {},
) {
    state.setViewModel(viewModel)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            }
        ) {
            Box(Modifier.size(300.dp, 300.dp)) {
                Card(modifier = Modifier.padding(20.dp)) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        when (uiState.result) {
                            is NfcScanDialogResult.None -> {
                                Text(text, textAlign = TextAlign.Center, fontSize = 48.sp)
                            }
                            is NfcScanDialogResult.Success -> {
                                Text("Success!", textAlign = TextAlign.Center, fontSize = 48.sp)
                                onScan((uiState.result as NfcScanDialogResult.Success).uid)
                                state.close()
                            }
                            is NfcScanDialogResult.Incompatible -> {
                                Text("Incompatible Tag", textAlign = TextAlign.Center, fontSize = 40.sp)
                            }
                            is NfcScanDialogResult.Rescan -> {
                                Text("Try Again", textAlign = TextAlign.Center, fontSize = 40.sp)
                            }
                            is NfcScanDialogResult.Tampered -> {
                                Text(">:(", textAlign = TextAlign.Center, fontSize = 40.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
