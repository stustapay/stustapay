package de.stustanet.stustapay.ui.chipscan

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.ModalDrawer
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch

@Composable
fun ChipScanView(
    viewModel: ChipScanViewModel = hiltViewModel(),
    state: ChipScanState = rememberChipScanState(viewModel::scan, viewModel::close),
    onScan: (ULong) -> Unit = {},
    screen: @Composable (ChipScanState) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    ModalDrawer(
        drawerState = state.getDrawerState(),
        drawerContent = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxSize()
            ) {
                if (state.isScanning && uiState.dataReady && uiState.compatible && uiState.authenticated && uiState.protected) {
                    Text("Success")
                    onScan(uiState.uid)
                    scope.launch { state.close() }
                } else {
                    Text("Scan a chip")
                }
            }
        }
    ) {
        screen(state)
    }

}
