package de.stustapay.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanDialogVariant
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel

/**
 * Shown when a chip was scanned but the server rejected payout (e.g. no balance).
 * Without this, [PayOutScan] would show a blank area because the NFC dialog already closed.
 */
@Composable
fun PayOutBlockedAfterScan(
    status: String,
    onClearTag: () -> Unit,
) {
    val message = status.ifBlank { stringResource(R.string.no_balance_for_payout) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        OperatorStatePanel(
            title = stringResource(R.string.common_status_failed),
            message = message,
            success = false,
        )
        OperatorActionButton(
            text = stringResource(R.string.common_action_scan),
            onClick = onClearTag,
            primary = false,
        )
    }
}
@Composable
fun PayOutScan(
    onScan: (NfcTag) -> Unit,
    status: String,
) {
    val scanState = rememberNfcScanDialogState()
    var dismissedWithoutScan by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        scanState.open()
        dismissedWithoutScan = false
    }

    NfcScanDialog(
        state = scanState,
        variant = NfcScanDialogVariant.Operator,
        showClarification = false,
        onDismiss = {
            dismissedWithoutScan = true
        },
        onScan = { tag ->
            dismissedWithoutScan = false
            onScan(tag)
        },
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        if (dismissedWithoutScan && !scanState.isOpen()) {
            OperatorActionButton(
                text = stringResource(R.string.common_action_scan),
                onClick = {
                    dismissedWithoutScan = false
                    scanState.open()
                },
                modifier = Modifier.padding(top = 8.dp),
                primary = false,
            )
        } else {
            Spacer(modifier = Modifier.weight(1f))
        }
        StatusText(
            status,
            modifier = Modifier.padding(vertical = 8.dp),
        )
    }
}
