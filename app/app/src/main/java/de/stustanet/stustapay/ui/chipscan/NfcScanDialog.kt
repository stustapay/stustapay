package de.stustanet.stustapay.ui.chipscan

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Card
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.UserTag

@Composable
fun NfcScanDialog(
    state: NfcScanDialogState,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    text: String = "Scan a Chip!",
    onScan: suspend (UserTag) -> Unit = {},
) {
    state.setViewModel(viewModel)
    val scanResult by viewModel.scanResult.collectAsStateWithLifecycle()

    LaunchedEffect(scanResult) {
        when (val res = scanResult.result) {
            is NfcScanDialogResult.Success -> {
                onScan(UserTag(res.uid))
                state.close()
            }
            else -> {}
        }
    }

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
                        when (scanResult.result) {
                            is NfcScanDialogResult.None -> {
                                Text(text, textAlign = TextAlign.Center, fontSize = 48.sp)
                            }
                            is NfcScanDialogResult.Success -> {
                                Text("Success!", textAlign = TextAlign.Center, fontSize = 48.sp)
                            }
                            is NfcScanDialogResult.Incompatible -> {
                                Text(
                                    "Incompatible Tag",
                                    textAlign = TextAlign.Center,
                                    fontSize = 40.sp
                                )
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
