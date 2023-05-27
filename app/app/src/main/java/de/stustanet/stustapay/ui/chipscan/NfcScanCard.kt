package de.stustanet.stustapay.ui.chipscan


import android.os.VibrationEffect
import android.os.Vibrator
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
import androidx.compose.ui.platform.LocalContext
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
    keepScanning: Boolean = false,  // after a successful scan, keep on scanning?
    showStatus: Boolean = true,  // display scan status below the content.
    content: @Composable (status: String) -> Unit = {
        // utf8 "satellite antenna"
        Text("Scan a Chip \uD83D\uDCE1", textAlign = TextAlign.Center, fontSize = 40.sp)
    },
) {

    val scanState by viewModel.scanState.collectAsStateWithLifecycle()
    val scanning by viewModel.scanning.collectAsStateWithLifecycle()
    val scanResult by viewModel.scanResult.collectAsStateWithLifecycle()
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    LaunchedEffect(scanResult) {
        val tag = scanResult
        if (tag != null) {
            if (checkScan(tag)) {
                vibrator.vibrate(VibrationEffect.createOneShot(300, 200))
                // this also resets tag to null
                viewModel.stopScan()
                onScan(tag)

                // continue scanning
                if (keepScanning) {
                    viewModel.scan()
                }
            }
        }
    }

    LaunchedEffect(scan) {
        // we want to enable scanning
        if (scan) {
            // we're not currently scanning
            if (!scanning) {
                viewModel.scan()
            }
        } else {
            viewModel.stopScan()
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
                content(scanState.status)

                if (showStatus) {
                    Text(
                        scanState.status,
                        textAlign = TextAlign.Left,
                        fontSize = 20.sp,
                    )
                }
            }
        }
    }
}
