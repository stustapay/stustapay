package de.stustanet.stustapay.ui.chipscan

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.size
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.common.DialogDisplayState
import de.stustanet.stustapay.ui.common.rememberDialogDisplayState

@Composable
fun rememberNfcScanDialogState(): DialogDisplayState {
    return rememberDialogDisplayState()
}


@Composable
fun NfcScanDialog(
    modifier: Modifier = Modifier.size(350.dp, 350.dp),
    state: DialogDisplayState,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    border: BorderStroke? = null,
    onDismiss: () -> Unit = {},
    checkScan: (UserTag) -> Boolean = { true },
    onScan: (UserTag) -> Unit = {},
    content: @Composable () -> Unit = {
        // utf8 "satellite antenna"
        Text("Scan a Chip \uD83D\uDCE1", textAlign = TextAlign.Center, fontSize = 40.sp)
    },
) {
    val scanResult by viewModel.scanState.collectAsStateWithLifecycle()
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    LaunchedEffect(scanResult) {
        val tag = scanResult.scanTag
        if (tag != null) {
            if (checkScan(tag)) {
                vibrator.vibrate(VibrationEffect.createOneShot(300, 200))
                state.close()
                onScan(tag)
            }
        }
    }

    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                viewModel.stopScan()
                state.close()
                onDismiss()
            }
        ) {
            NfcScanCard(
                modifier = modifier,
                viewModel = viewModel,
                border = border,
                checkScan = checkScan,
                onScan = { tag ->
                    state.close()
                    onScan(tag)
                },
                content = content,
            )
        }
    }
}
