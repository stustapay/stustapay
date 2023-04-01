package de.stustanet.stustapay.ui.chipscan

import androidx.compose.foundation.layout.*
import androidx.compose.material.Card
import androidx.compose.material.ModalDrawer
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun ChipScanDialog(
    viewModel: ChipScanViewModel = hiltViewModel(),
    text: String = "Scan a Chip!",
    onScan: (ULong) -> Unit = {},
    onDismissRequest: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    viewModel.scan()

    Dialog(
        onDismissRequest = {
            viewModel.close()
            onDismissRequest()
        }
    ) {
        Box(Modifier.size(300.dp, 300.dp)) {
            Card(modifier = Modifier.padding(20.dp)) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (uiState.dataReady && uiState.compatible && uiState.authenticated && uiState.protected) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "Success!", textAlign = TextAlign.Center, fontSize = 48.sp)
                        }

                        viewModel.close()
                        onScan(uiState.uid)
                        onDismissRequest()
                    } else {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text, textAlign = TextAlign.Center, fontSize = 48.sp)
                        }
                    }
                }
            }
        }
    }
}
