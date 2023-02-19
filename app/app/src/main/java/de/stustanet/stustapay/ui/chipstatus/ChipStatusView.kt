package de.stustanet.stustapay.ui.chipstatus

import android.widget.Toast
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanView
import de.stustanet.stustapay.ui.chipscan.rememberChipScanState
import kotlinx.coroutines.launch

@Preview
@Composable
fun ChipStatusView(viewModel: ChipStatusViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val scanViewUid = remember { mutableStateOf(0uL) }

    ChipScanView(onScan = { scanViewUid.value = it }) { chipScanState ->
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            Column {
                Button(
                    onClick = { scope.launch { chipScanState.scan() } },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Test scan view")
                }

                val uid = scanViewUid.value
                Text("UID: $uid")

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Switch(checked = uiState.scanRequest, onCheckedChange = { viewModel.scan(it) })
                    Text("Enable scanning")
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Switch(checked = uiState.writeRequest, onCheckedChange = { viewModel.write(it) })
                    Text("Enable writing")
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Switch(checked = uiState.protectRequest, onCheckedChange = { viewModel.protect(it) })
                    Text("Protect chip")
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxSize()
            ) {
                if (uiState.dataReady) {
                    if (uiState.compatible) {
                        if (uiState.authenticated) {
                            Text("Authenticated")
                        } else {
                            Text("Not authenticated")
                        }

                        if (uiState.protected) {
                            Text("Protected")
                        } else {
                            Text("Not protected")
                        }

                        val uid = uiState.uid
                        Text("UID: $uid")
                    } else {
                        Text("Incompatible chip")
                    }
                } else {
                    Text("Scan a chip")
                }
            }
        }
    }
}
