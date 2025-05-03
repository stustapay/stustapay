package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.device.DeviceConfigProvider
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Composable
fun AccountScan(onScan: (NfcTag) -> Unit) {
    // Get DeviceConfigProvider using Hilt EntryPoint
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    
    val deviceConfig = deviceConfigProvider.getDeviceConfig()
    
    // Calculate adjusted size based on device config scale factor
    val adjustedWidth = (350 * deviceConfig.nfcScanDialogScale).dp
    val adjustedHeight = (350 * deviceConfig.nfcScanDialogScale).dp
    
    // Use the same responsive approach as in NfcScanDialog
    Box(
        modifier = Modifier
            .padding(20.dp)
            .fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        if (deviceConfig.useCenteredDialog) {
            // For small screens like Sunmi L2S Pro, use a simple centered approach
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                NfcScanCard(
                    modifier = Modifier.size(width = adjustedWidth, height = adjustedHeight),
                    onScan = onScan,
                    keepScanning = true,
                    content = { status ->
                        // Use our enhanced content with small screen awareness
                        EnhancedAccountScanContent(
                            isIminFalcons2 = deviceConfig.isIminFalcons2,
                            isSmallScreen = deviceConfig.isSmallScreen,
                            scanStatus = status
                        )
                    }
                )
            }
        } else {
            // For other devices, use the original approach with offset positioning
            Box(
                modifier = Modifier
                    .size(1000.dp, 800.dp)
                    .padding(
                        start = if (deviceConfig.isSmallScreen) 150.dp else 350.dp
                    ),
                contentAlignment = Alignment.CenterStart
            ) {
                NfcScanCard(
                    modifier = Modifier
                        .size(width = adjustedWidth, height = adjustedHeight)
                        .offset(
                            x = deviceConfig.nfcScanDialogOffset.x,
                            y = deviceConfig.nfcScanDialogOffset.y
                        ),
                    onScan = onScan,
                    keepScanning = true,
                    content = { status ->
                        EnhancedAccountScanContent(
                            isIminFalcons2 = deviceConfig.isIminFalcons2,
                            isSmallScreen = deviceConfig.isSmallScreen,
                            scanStatus = status
                        )
                    }
                )
            }
        }
    }
}