package de.stustapay.stustapay.ui.chipscan

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.size
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.UserTag
import de.stustapay.stustapay.ui.common.DialogDisplayState
import de.stustapay.stustapay.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.ui.theme.NfcScanStyle

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
    content: @Composable (status: String) -> Unit = {
        // utf8 "satellite antenna"
        Text(stringResource(R.string.nfc_scan_prompt), style = NfcScanStyle)
    },
) {
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
