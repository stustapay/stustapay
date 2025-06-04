package de.stustapay.stustapay.ui.chipscan

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.libssp.ui.theme.NfcScanStyle
import de.stustapay.stustapay.ui.device.DeviceConfigProvider
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Composable
fun rememberNfcScanDialogState(): DialogDisplayState {
    return rememberDialogDisplayState()
}

@Composable
fun NfcClarificationGraphic(
    modifier: Modifier = Modifier,
    isSmallScreen: Boolean = false,
    scale: Float = 1.0f
) {
    // Make it the same size as the scan dialog
    val size = (350 * scale).dp
    
    Card(
        modifier = modifier.size(size),
        elevation = 4.dp,
        backgroundColor = MaterialTheme.colors.surface,
        shape = RoundedCornerShape(12.dp)
    ) {
        // Just the image, no text - same size as scan dialog
        Image(
            painter = painterResource(id = R.drawable.nfc_topup_clarification),
            contentDescription = "NFC Top-up Instructions",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Fit
        )
    }
}

@Composable
fun NfcScanDialog(
    modifier: Modifier = Modifier.size(350.dp, 350.dp),
    state: DialogDisplayState,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    border: BorderStroke? = null,
    onDismiss: () -> Unit = {},
    checkScan: (NfcTag) -> Boolean = { true },
    onScan: (NfcTag) -> Unit = {},
    showClarification: Boolean = false,
    content: @Composable (status: String) -> Unit = { status ->
        // This default content will be overridden with our enhanced UI
        Text(stringResource(R.string.nfc_scan_prompt), style = NfcScanStyle)
    },
) {
    // Get DeviceConfigProvider using Hilt EntryPoint
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    
    if (state.isOpen()) {
        // Get device-specific configuration
        val deviceConfig = deviceConfigProvider.getDeviceConfig()
        val scanState by viewModel.scanState.collectAsStateWithLifecycle()
        
        // Calculate adjusted size based on device config scale factor
        val adjustedWidth = (350 * deviceConfig.nfcScanDialogScale).dp
        val adjustedHeight = (350 * deviceConfig.nfcScanDialogScale).dp
        
        Dialog(
            onDismissRequest = {
                viewModel.stopScan()
                state.close()
                onDismiss()
            },
            // Use properties to enable dialog positioning
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true,
                usePlatformDefaultWidth = false
            )
        ) {
            if (deviceConfig.useCenteredDialog) {
                // For small screens like Sunmi L2S Pro, use a simple centered approach
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    if (showClarification) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            NfcScanCard(
                                modifier = Modifier.size(width = adjustedWidth, height = adjustedHeight),
                                viewModel = viewModel,
                                border = border,
                                checkScan = checkScan,
                                onScan = { tag ->
                                    state.close()
                                    onScan(tag)
                                },
                                onCancel = {
                                    viewModel.stopScan()
                                    state.close()
                                    onDismiss()
                                },
                                content = { status -> 
                                    EnhancedNfcScanContent(
                                        isIminFalcons2 = deviceConfig.isIminFalcons2,
                                        isSmallScreen = deviceConfig.isSmallScreen,
                                        scanStatus = status
                                    )
                                },
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Clarification graphic
                            NfcClarificationGraphic(
                                modifier = Modifier,
                                isSmallScreen = deviceConfig.isSmallScreen,
                                scale = deviceConfig.nfcScanDialogScale
                            )
                        }
                    } else {
                        NfcScanCard(
                            modifier = Modifier.size(width = adjustedWidth, height = adjustedHeight),
                            viewModel = viewModel,
                            border = border,
                            checkScan = checkScan,
                            onScan = { tag ->
                                state.close()
                                onScan(tag)
                            },
                            onCancel = {
                                viewModel.stopScan()
                                state.close()
                                onDismiss()
                            },
                            content = { status -> 
                                EnhancedNfcScanContent(
                                    isIminFalcons2 = deviceConfig.isIminFalcons2,
                                    isSmallScreen = deviceConfig.isSmallScreen,
                                    scanStatus = status
                                )
                            },
                        )
                    }
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
                    if (showClarification) {
                        Row {
                            NfcScanCard(
                                modifier = Modifier
                                    .size(width = adjustedWidth, height = adjustedHeight)
                                    .offset(
                                        x = deviceConfig.nfcScanDialogOffset.x,
                                        y = deviceConfig.nfcScanDialogOffset.y
                                    ),
                                viewModel = viewModel,
                                border = border,
                                checkScan = checkScan,
                                onScan = { tag ->
                                    state.close()
                                    onScan(tag)
                                },
                                onCancel = {
                                    viewModel.stopScan()
                                    state.close()
                                    onDismiss()
                                },
                                content = { status -> 
                                    EnhancedNfcScanContent(
                                        isIminFalcons2 = deviceConfig.isIminFalcons2,
                                        isSmallScreen = deviceConfig.isSmallScreen,
                                        scanStatus = status
                                    )
                                },
                            )
                            
                            Spacer(modifier = Modifier.width(16.dp))
                            
                            // Clarification graphic positioned to the right of the scan dialog
                            NfcClarificationGraphic(
                                modifier = Modifier
                                    .offset(y = deviceConfig.nfcScanDialogOffset.y),
                                isSmallScreen = deviceConfig.isSmallScreen,
                                scale = deviceConfig.nfcScanDialogScale
                            )
                        }
                    } else {
                        NfcScanCard(
                            modifier = Modifier
                                .size(width = adjustedWidth, height = adjustedHeight)
                                .offset(
                                    x = deviceConfig.nfcScanDialogOffset.x,
                                    y = deviceConfig.nfcScanDialogOffset.y
                                ),
                            viewModel = viewModel,
                            border = border,
                            checkScan = checkScan,
                            onScan = { tag ->
                                state.close()
                                onScan(tag)
                            },
                            onCancel = {
                                viewModel.stopScan()
                                state.close()
                                onDismiss()
                            },
                            content = { status -> 
                                EnhancedNfcScanContent(
                                    isIminFalcons2 = deviceConfig.isIminFalcons2,
                                    isSmallScreen = deviceConfig.isSmallScreen,
                                    scanStatus = status
                                )
                            },
                        )
                    }
                }
            }
        }
    }
}
