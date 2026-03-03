package de.stustapay.stustapay.ui.chipscan

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Composable
fun rememberNfcScanDialogState(): DialogDisplayState {
    return rememberDialogDisplayState()
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
        // Calculate adjusted size based on device config scale factor
        val baseWidth = if (showClarification) 560 else 350
        val baseHeight = if (showClarification) 260 else 350
        val adjustedWidth = (baseWidth * deviceConfig.nfcScanDialogScale).dp
        val adjustedHeight = (baseHeight * deviceConfig.nfcScanDialogScale).dp
        
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
                        NfcScanCard(
                            modifier = Modifier.size(width = adjustedWidth, height = adjustedHeight),
                            viewModel = viewModel,
                            border = border ?: BorderStroke(2.dp, SelfServicePalette.panelBorder),
                            backgroundColor = SelfServicePalette.panel,
                            shape = RoundedCornerShape(if (deviceConfig.isSmallScreen) 16.dp else 20.dp),
                            checkScan = checkScan,
                            showStatus = false,
                            showCloseButton = false,
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
                                PencilScanChipContent(
                                    isSmallScreen = deviceConfig.isSmallScreen,
                                    scanStatus = status
                                )
                            },
                        )
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
                        NfcScanCard(
                            modifier = Modifier
                                .size(width = adjustedWidth, height = adjustedHeight)
                                .offset(
                                    x = deviceConfig.nfcScanDialogOffset.x,
                                    y = deviceConfig.nfcScanDialogOffset.y
                                ),
                            viewModel = viewModel,
                            border = border ?: BorderStroke(2.dp, SelfServicePalette.panelBorder),
                            backgroundColor = SelfServicePalette.panel,
                            shape = RoundedCornerShape(if (deviceConfig.isSmallScreen) 16.dp else 20.dp),
                            checkScan = checkScan,
                            showStatus = false,
                            showCloseButton = false,
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
                                PencilScanChipContent(
                                    isSmallScreen = deviceConfig.isSmallScreen,
                                    scanStatus = status
                                )
                            },
                        )
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

@Composable
private fun PencilScanChipContent(
    isSmallScreen: Boolean,
    scanStatus: String
) {
    val infiniteTransition = rememberInfiniteTransition()
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(900),
            repeatMode = RepeatMode.Reverse
        )
    )

    val centerSize = if (isSmallScreen) 98.dp else 120.dp
    val nearIconSize = if (isSmallScreen) 24.dp else 30.dp

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 8.dp else 10.dp)
    ) {
        Box(
            modifier = Modifier
                .size(centerSize)
                .background(Color(0xFF203659), CircleShape)
                .padding(if (isSmallScreen) 18.dp else 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF2A4A78), CircleShape)
                    .padding(if (isSmallScreen) 16.dp else 18.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(SelfServicePalette.accent, CircleShape)
                        .scale(pulseScale),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.NearMe,
                        contentDescription = null,
                        tint = SelfServicePalette.backgroundTop,
                        modifier = Modifier.size(nearIconSize)
                    )
                }
            }
        }

        Text(
            text = stringResource(R.string.selfservice_scan_balance_title),
            color = SelfServicePalette.title,
            fontWeight = FontWeight.Bold,
            fontSize = if (isSmallScreen) 18.sp else 20.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = if (scanStatus.isBlank()) {
                stringResource(R.string.topup_scan_instruction)
            } else {
                scanStatus
            },
            color = SelfServicePalette.subtitle,
            fontWeight = FontWeight.Medium,
            fontSize = if (isSmallScreen) 12.sp else 14.sp,
            textAlign = TextAlign.Center
        )
    }
}
