package de.stustanet.stustapay.ui.chipscan


import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.UserTag

@Composable
fun NfcScanCard(
    modifier: Modifier = Modifier.size(350.dp, 350.dp),
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    border: BorderStroke? = null,
    checkScan: (UserTag) -> Boolean = { true },
    onScan: (UserTag) -> Unit = {},
    scan: Boolean = true,  // is scanning active?
    keepScanning: Boolean = false,  // after a successfull scan, keep on scanning?
    content: @Composable () -> Unit = {
        // utf8 "satellite antenna"
        Text("Scan a Chip \uD83D\uDCE1", textAlign = TextAlign.Center, fontSize = 40.sp)
    },
) {
    val scanResult by viewModel.scanState.collectAsStateWithLifecycle()

    LaunchedEffect(scanResult, scan) {
        val tag = scanResult.scanTag
        if (tag == null) {
            // no scanned tag yet -> set desired scan state
            if (scan) {
                viewModel.scan()
            } else {
                viewModel.stopScan()
            }
        }
        else {
            // we've scanned a tag
            // if the tag is good, return it, and maybe continue scanning
            // of stop scanning
            if (scan) {
                if (checkScan(tag)) {
                    viewModel.stopScan()
                    onScan(tag)

                    // continue scanning
                    if (keepScanning) {
                        viewModel.scan()
                    }
                }
            }
            else {
                viewModel.stopScan()
            }
        }
    }

    Card(
        shape = RoundedCornerShape(10.dp),
        border = border,
        modifier = modifier,
        elevation = 8.dp,
    ) {
        Box(
            modifier = Modifier
                .padding(10.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.Center
            ) {
                content()

                Text(
                    scanResult.status,
                    textAlign = TextAlign.Left,
                    fontSize = 20.sp,
                )
            }
        }
    }
}
