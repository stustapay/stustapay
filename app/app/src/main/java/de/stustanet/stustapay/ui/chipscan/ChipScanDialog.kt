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
fun ChipScanDialog(
    state: ChipScanState,
    viewModel: ChipScanViewModel = hiltViewModel(),
    text: String = "Scan a Chip!",
    onScan: (ULong) -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    state.setViewModel(viewModel)

    if (uiState.success) {
        onScan(uiState.uid)
        state.close()
    }

    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
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
                            Text(text, textAlign = TextAlign.Center, fontSize = 48.sp)
                        }
                    }
                }
            }
        }
    }
}
