package de.stustapay.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.theme.NfcScanStyle


@Composable
fun PayOutScan(
    onScan: (UserTag) -> Unit,
    status: String
) {

    Scaffold(
        bottomBar = {
            StatusText(
                status,
                modifier = Modifier.padding(horizontal = 20.dp)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .padding(paddingValues)
                .padding(20.dp)
                .fillMaxWidth(),
        ) {
            item {
                NfcScanCard(
                    modifier = Modifier
                        .padding(20.dp)
                        .fillMaxWidth(),
                    onScan = onScan,
                    showStatus = false,
                ) { scanStatus ->
                    Text(
                        text = "Scan a Chip",
                        modifier = Modifier.fillMaxWidth(),
                        style = NfcScanStyle,
                    )
                    Text(
                        // money with wings
                        text = "\uD83D\uDCB8",
                        modifier = Modifier.fillMaxWidth(),
                        fontSize = 100.sp,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = scanStatus,
                        modifier = Modifier.fillMaxWidth(),
                        fontSize = 26.sp,
                    )
                }
            }
        }
    }
}