package de.stustanet.stustapay.ui.debug

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanDialog

@Preview
@Composable
fun NfcDebugView(viewModel: NfcDebugViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var scanViewUid by remember { mutableStateOf(0uL) }
    var scanViewOpen by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    Column(modifier = Modifier
        .padding(16.dp)
        .fillMaxSize()
        .verticalScroll(state = scrollState)
    ) {
        Text(text = "Scan View", fontSize = 24.sp)

        Button(
            onClick = { scanViewOpen = true },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open Scan View")
        }

        val uid = scanViewUid
        Text("UID: $uid")

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Global Settings", fontSize = 24.sp)

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Switch(checked = uiState.cmacEnabled, onCheckedChange = { viewModel.cmac(it) })
            Text("Enable CMAC authentication")
        }

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Switch(checked = uiState.enableDebugCard, onCheckedChange = { viewModel.debug(it) })
            Text("Enable debug chip")
        }

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Scan Settings", fontSize = 24.sp)

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
            Switch(checked = uiState.protectRequest, onCheckedChange = { viewModel.writeProtect(it) })
            Text("Write chip protection")
        }

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Switch(checked = uiState.cmacRequest, onCheckedChange = { viewModel.writeCmac(it) })
            Text("Write CMAC enable")
        }

        Text("Content")
        TextField(
            value = uiState.content,
            modifier = Modifier.fillMaxWidth(),
            onValueChange = { viewModel.setContent(it) }
        )

        Spacer(modifier = Modifier.height(32.dp))
        Text(text = "Scan Results", fontSize = 24.sp)

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
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

                    val tagId = uiState.uid
                    Text("UID: $tagId")
                } else {
                    Text("Incompatible chip")
                }
            } else {
                Text("Scan a chip")
            }
        }
    }

    if (scanViewOpen) {
        ChipScanDialog(onScan = { scanViewUid = it }, onDismissRequest = { scanViewOpen = false })
    }
}
