package de.stustapay.stustapay.ui.chipscan


import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.R
import de.stustapay.libssp.ui.theme.NfcScanStyle

@Composable
fun NfcScanCard(
    modifier: Modifier = Modifier,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    border: BorderStroke? = null,
    checkScan: (UserTag) -> Boolean = { true },
    onScan: (UserTag) -> Unit,
    scan: Boolean = true,  // is scanning active?
    keepScanning: Boolean = false,  // after a successful scan, keep on scanning?
    showStatus: Boolean = true,  // display scan status below the content.
    content: @Composable (status: String) -> Unit = {
        // utf8 "satellite antenna"
        Text(
            stringResource(R.string.nfc_scan_prompt),
            style = NfcScanStyle,
        )
    },
) {

    val scanState by viewModel.scanState.collectAsStateWithLifecycle()
    val scanning by viewModel.scanning.collectAsStateWithLifecycle()
    val scanResult by viewModel.scanResult.collectAsStateWithLifecycle()
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    // enable or disable scanning
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

    // process scan results
    LaunchedEffect(scanResult) {
        val tag = scanResult
        if (tag != null) {
            vibrator.vibrate(VibrationEffect.createOneShot(300, 200))
            if (checkScan(tag)) {

                onScan(tag)

                // initiate the next scan
                if (keepScanning) {
                    viewModel.scan()
                } else {
                    viewModel.stopScan()
                }
            } else {
                // successful but non-valid scan result
                // -> keep scanning regularly.
                viewModel.scan()
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
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                content(scanState.status)

                if (showStatus) {
                    Text(
                        // "scan=$scan, res=$scanResult, scanning=$scanning, status: ${scanState.status}",
                        scanState.status,
                        fontSize = 20.sp,
                    )
                }
            }
        }
    }
}
