package de.stustanet.stustapay.ui.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanCard

@Composable
fun AccountScan(onScan: (UserTag) -> Unit) {
    Box(modifier = Modifier.padding(20.dp)) {
        NfcScanCard(
            onScan = onScan,
            keepScanning = true
        )
    }
}