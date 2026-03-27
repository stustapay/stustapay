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
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanDialogVariant
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Composable
fun AccountScan(
    isSelfService: Boolean = false,
    onBack: () -> Unit = {},
    onScan: (NfcTag) -> Unit
) {
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }

    val deviceConfig = deviceConfigProvider.getDeviceConfig()
    val profile = rememberSelfServiceDeviceProfile()
    val operatorScanState = rememberNfcScanDialogState()

    if (isSelfService) {
        val useIminDialogGeometry = deviceConfig.isIminFalcons2

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

                BoxWithConstraints(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    val scanCardModifier = if (useIminDialogGeometry) {
                        val preferredWidth = if (profile.isSmallScreen) 380.dp else 430.dp
                        val preferredHeight = if (profile.isSmallScreen) 380.dp else 440.dp
                        val clampedWidth = preferredWidth.coerceAtMost(maxWidth)
                        val clampedHeight = preferredHeight.coerceAtMost(maxHeight)
                        val maxHorizontalOffset = ((maxWidth - clampedWidth) / 2).coerceAtLeast(0.dp)
                        val maxVerticalOffset = ((maxHeight - clampedHeight) / 2).coerceAtLeast(0.dp)

                        Modifier
                            .size(width = clampedWidth, height = clampedHeight)
                            .offset(
                                x = deviceConfig.nfcScanDialogOffset.x.coerceIn(
                                    minimumValue = -maxHorizontalOffset,
                                    maximumValue = maxHorizontalOffset,
                                ),
                                y = deviceConfig.nfcScanDialogOffset.y.coerceIn(
                                    minimumValue = -maxVerticalOffset,
                                    maximumValue = maxVerticalOffset,
                                ),
                            )
                    } else {
                        Modifier.fillMaxWidth()
                    }

                    NfcScanCard(
                        modifier = scanCardModifier,
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

    LaunchedEffect(Unit) {
        operatorScanState.open()
    }

    NfcScanDialog(
        state = operatorScanState,
        variant = NfcScanDialogVariant.Operator,
        onDismiss = onBack,
        onScan = onScan,
    ) { status, compactLayout ->
        PencilOperatorScanContent(
            title = stringResource(R.string.account_scan_balance_check_title),
            subtitle = stringResource(R.string.account_scan_subtitle),
            scanStatus = status,
            isSmallScreen = compactLayout,
            showStatusPanel = false,
        )
    }

    OperatorScaffold(
        title = stringResource(R.string.customer_title),
        subtitle = stringResource(R.string.account_scan_subtitle),
        icon = Icons.Filled.Person,
        terminalLabel = stringResource(R.string.account_terminal_label),
        footerHint = stringResource(R.string.account_scan_ready_nfc),
        footerSection = stringResource(R.string.account_terminal_label),
        footerStatus = stringResource(R.string.account_scan_waiting_tag),
        onBack = onBack,
    ) {
        Box(modifier = Modifier.fillMaxSize())
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
