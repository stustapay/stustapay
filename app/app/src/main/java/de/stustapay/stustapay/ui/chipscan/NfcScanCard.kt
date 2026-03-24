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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.libssp.ui.theme.NfcScanStyle

@Composable
fun NfcScanCard(
    modifier: Modifier = Modifier,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    border: BorderStroke? = null,
    checkScan: (NfcTag) -> Boolean = { true },
    onScan: (NfcTag) -> Unit,
    scan: Boolean = true,  // is scanning active?
    keepScanning: Boolean = false,  // after a successful scan, keep on scanning?
    showStatus: Boolean = true,  // display scan status below the content.
    showCloseButton: Boolean = true,
    shape: Shape = RoundedCornerShape(10.dp),
    backgroundColor: Color = MaterialTheme.colors.surface,
    onCancel: () -> Unit = { viewModel.stopScan() },  // Called when cancel button is pressed
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
        shape = shape,
        border = border,
        backgroundColor = backgroundColor,
        modifier = modifier,
        elevation = 8.dp,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            // Cancel button in the top-right corner of the card, moved outside padding area
            if (showCloseButton) {
                IconButton(
                    onClick = onCancel,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = stringResource(R.string.common_action_cancel),
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colors.primary
                    )
                }
            }
            
            val contentPadding = if (showCloseButton) 10.dp else 8.dp
            val contentTopPadding = if (showCloseButton) 36.dp else 8.dp
            Column(
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .padding(contentPadding)
                    .padding(top = contentTopPadding)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
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
