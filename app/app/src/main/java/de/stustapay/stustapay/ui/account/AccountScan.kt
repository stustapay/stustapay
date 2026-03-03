package de.stustapay.stustapay.ui.account

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Composable
fun AccountScan(
    isSelfService: Boolean = false,
    onScan: (NfcTag) -> Unit
) {
    // Get DeviceConfigProvider using Hilt EntryPoint
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    
    val deviceConfig = deviceConfigProvider.getDeviceConfig()
    
    val profile = rememberSelfServiceDeviceProfile()

    // Calculate adjusted size based on device config scale factor
    val baseWidth = if (isSelfService) 620 else 350
    val baseHeight = if (isSelfService) 300 else 350
    val adjustedWidth = (baseWidth * deviceConfig.nfcScanDialogScale).dp
    val adjustedHeight = (baseHeight * deviceConfig.nfcScanDialogScale).dp

    if (isSelfService) {
        SelfServiceBackground {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(
                        horizontal = profile.contentPaddingHorizontal,
                        vertical = profile.contentPaddingVertical
                    ),
                verticalArrangement = Arrangement.spacedBy(if (profile.isSmallScreen) 10.dp else 14.dp)
            ) {
                SelfServiceHeadline(
                    title = stringResource(R.string.selfservice_check_balance),
                    subtitle = stringResource(R.string.selfservice_hint_scan),
                    titleFontSize = profile.headlineTitleSize,
                    subtitleFontSize = profile.headlineSubtitleSize
                )

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    NfcScanCard(
                        modifier = Modifier.size(width = adjustedWidth, height = adjustedHeight),
                        onScan = onScan,
                        keepScanning = true,
                        showStatus = false,
                        showCloseButton = false,
                        border = BorderStroke(2.dp, SelfServicePalette.panelBorder),
                        backgroundColor = SelfServicePalette.panel,
                        shape = RoundedCornerShape(if (profile.isSmallScreen) 20.dp else 24.dp),
                        content = { status ->
                            PencilCheckBalancePanelContent(
                                isSmallScreen = profile.isSmallScreen,
                                scanStatus = status
                            )
                        }
                    )
                }
            }
        }
        return
    }
    
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
                            isSelfService = isSelfService,
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
                            isSelfService = isSelfService,
                            scanStatus = status
                        )
                    }
                )
            }
        }
    }
}

@Composable
private fun PencilCheckBalancePanelContent(
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

    val outerSize = if (isSmallScreen) 132.dp else 180.dp
    val midPadding = if (isSmallScreen) 18.dp else 24.dp
    val innerPadding = if (isSmallScreen) 14.dp else 18.dp
    val iconSize = if (isSmallScreen) 36.dp else 56.dp

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 8.dp else 12.dp)
    ) {
        Text(
            text = stringResource(R.string.selfservice_scan_balance_title),
            color = SelfServicePalette.title,
            fontWeight = FontWeight.Bold,
            fontSize = if (isSmallScreen) 24.sp else 34.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = stringResource(R.string.selfservice_scan_balance_subtitle),
            color = SelfServicePalette.subtitle,
            fontWeight = FontWeight.Medium,
            fontSize = if (isSmallScreen) 14.sp else 20.sp,
            textAlign = TextAlign.Center
        )

        Box(
            modifier = Modifier
                .size(outerSize)
                .background(Color(0xFF203659), CircleShape)
                .padding(midPadding),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF2A4A78), CircleShape)
                    .padding(innerPadding),
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
                        modifier = Modifier.size(iconSize)
                    )
                }
            }
        }

        Text(
            text = scanStatus,
            color = SelfServicePalette.subtitle,
            fontWeight = FontWeight.Medium,
            fontSize = if (isSmallScreen) 12.sp else 14.sp,
            textAlign = TextAlign.Center
        )
    }
}
