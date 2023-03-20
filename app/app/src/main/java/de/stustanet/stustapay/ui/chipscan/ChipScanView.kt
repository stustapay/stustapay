package de.stustanet.stustapay.ui.chipscan

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.ModalDrawer
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun ChipScanView(
    viewModel: ChipScanViewModel = hiltViewModel(),
    state: ChipScanState = rememberChipScanState(viewModel::scan, viewModel::close),
    onScan: (ULong) -> Unit = {},
    screen: @Composable (ChipScanState) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ModalDrawer(
        drawerState = state.getDrawerState(),
        drawerContent = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxSize()
            ) {
                if (state.isScanning && uiState.dataReady && uiState.compatible && uiState.authenticated && uiState.protected) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "Success", fontSize = 48.sp)
                    }

                    onScan(uiState.uid)
                    LaunchedEffect(state) {
                        state.close()
                    }
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = state.prompt, fontSize = 48.sp)
                    }
                }
            }
        }
    ) {
        screen(state)
    }
}
