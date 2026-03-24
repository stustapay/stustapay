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
        val modelRaw = Build.MODEL.lowercase()
        // MODEL sometimes includes spaces (e.g. "L2 PRO"); Sunmi L2s Pro often reports as "T8920" with no "l2" in MODEL.
        val model = modelRaw.replace(" ", "")
        val manufacturer = Build.MANUFACTURER.lowercase()

        // imin Falcon 2 configuration - NFC reader is on the left side
        if (model.contains("i24t01")) {
            return DeviceConfig(
                isIminFalcons2 = true,
                nfcScanDialogOffset = DpOffset((-350).dp, 0.dp) // Moved dialog even further to the left
            )
        }

        val sunmiL2Handheld = manufacturer.contains("sunmi") && (
            model.contains("l2") ||
            model.contains("t892") ||
            model.contains("t891")
        )
        val legacyModelMatch =
            model.contains("l2s") ||
                model.contains("l2k") ||
                model.contains("l2pro") ||
                modelRaw.contains("sunmi")

        // Sunmi L2 family and similar small-screen handhelds
        if (sunmiL2Handheld || legacyModelMatch) {
            return DeviceConfig(
                isSmallScreen = true,
                nfcScanDialogScale = 0.7f, // Reduce the size by 30%
                useCenteredDialog = true, // Use centered positioning instead of offset
                nfcScanDialogOffset = DpOffset(0.dp, 0.dp) // No offset needed with centered positioning
            )
        }
        
        // Default configuration for other devices
        return DeviceConfig()
    }
} 