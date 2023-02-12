package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import de.stustanet.stustapay.nfc.NFCContext

@Composable
fun ChipStatusView(nfcContext: NFCContext) {
    Column (
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        val uid = nfcContext.uid!!.value
        Text("UID: $uid")
    }
}
