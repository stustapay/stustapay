package de.stustapay.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.device.DeviceConfigProvider
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint
import de.stustapay.libssp.ui.theme.NfcScanStyle


@Composable
fun PayOutScan(
    onScan: (NfcTag) -> Unit,
    status: String
) {
    // Get DeviceConfigProvider using Hilt EntryPoint
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    
    // Get device-specific configuration
    val deviceConfig = deviceConfigProvider.getDeviceConfig()

    Scaffold(
        bottomBar = {
            StatusText(
                status,
                modifier = Modifier.padding(horizontal = 20.dp)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            // Use a centered approach similar to NfcScanDialog
            NfcScanCard(
                modifier = Modifier
                    .size((350 * deviceConfig.nfcScanDialogScale).dp, (350 * deviceConfig.nfcScanDialogScale).dp)
                    .offset(
                        x = deviceConfig.nfcScanDialogOffset.x,
                        y = deviceConfig.nfcScanDialogOffset.y
                ),
                onScan = onScan,
                showStatus = false,
                border = androidx.compose.foundation.BorderStroke(2.dp, de.stustapay.stustapay.ui.common.operator.OperatorPalette.panelBorder),
                backgroundColor = de.stustapay.stustapay.ui.common.operator.OperatorPalette.panelMuted,
                content = { scanStatus ->
                    PencilOperatorScanContent(
                        scanStatus = scanStatus,
                        isSmallScreen = deviceConfig.isSmallScreen
                    )
                }
            )
        }
    }
}
