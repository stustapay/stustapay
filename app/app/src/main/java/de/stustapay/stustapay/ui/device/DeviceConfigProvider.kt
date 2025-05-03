package de.stustapay.stustapay.ui.device

import android.content.Context
import android.os.Build
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Device-specific configuration.
 */
data class DeviceConfig(
    // Whether this device is an imin Falcons 2 terminal
    val isIminFalcons2: Boolean = false,
    // The offset for NFC scan dialog for this specific device
    val nfcScanDialogOffset: DpOffset = DpOffset(0.dp, 0.dp),
    // Scaling factor for the NFC scan dialog (1.0f is standard size)
    val nfcScanDialogScale: Float = 1.0f,
    // Whether this is a small screen device
    val isSmallScreen: Boolean = false,
    // Whether to use centered positioning for the dialog
    val useCenteredDialog: Boolean = false
)

/**
 * Provides device-specific configurations based on the device model.
 */
@Singleton
class DeviceConfigProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val deviceConfig: DeviceConfig = determineDeviceConfig()

    /**
     * Get the device-specific configuration.
     */
    fun getDeviceConfig(): DeviceConfig = deviceConfig

    private fun determineDeviceConfig(): DeviceConfig {
        val model = Build.MODEL.lowercase()
        
        // imin Falcon 2 configuration - NFC reader is on the left side
        if (model.contains("i24t01")) {
            return DeviceConfig(
                isIminFalcons2 = true,
                nfcScanDialogOffset = DpOffset((-300).dp, 0.dp) // Move dialog much further to the left
            )
        }
        
        // Sunmi L2S Pro configuration - Small screen device
        if (model.contains("l2s") || model.contains("l2k") || model.contains("sunmi")) {
            return DeviceConfig(
                isSmallScreen = true,
                nfcScanDialogScale = 0.7f,  // Reduce the size by 30%
                useCenteredDialog = true,    // Use centered positioning instead of offset
                nfcScanDialogOffset = DpOffset(0.dp, 0.dp)  // No offset needed with centered positioning
            )
        }
        
        // Default configuration for other devices
        return DeviceConfig()
    }
} 