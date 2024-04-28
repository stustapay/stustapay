package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.ui.chipscan.NfcScanCard

@Composable
fun AccountScan(onScan: (NfcTag) -> Unit) {
    Box(
        modifier = Modifier
            .padding(20.dp)
            .fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        NfcScanCard(
            onScan = onScan,
            keepScanning = true
        )
    }
}