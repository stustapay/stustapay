package de.stustapay.stustapay.ui.chipscan

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.rounded.Contactless
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.libssp.ui.theme.NfcScanStyle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceSectionHeader
import de.stustapay.stustapay.ui.common.theme.TfPayBluePalette
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Composable
fun rememberNfcScanDialogState(): DialogDisplayState {
    return rememberDialogDisplayState()
}

enum class NfcScanDialogVariant {
    Default,
    Operator,
}

@Composable
fun NfcScanDialog(
    modifier: Modifier = Modifier,
    state: DialogDisplayState,
    viewModel: NfcScanDialogViewModel = hiltViewModel(),
    border: BorderStroke? = null,
    onDismiss: () -> Unit = {},
    checkScan: (NfcTag) -> Boolean = { true },
    onScan: (NfcTag) -> Unit = {},
    showClarification: Boolean = false,
    dismissOnBackPress: Boolean = true,
    dismissOnClickOutside: Boolean = true,
    variant: NfcScanDialogVariant = NfcScanDialogVariant.Operator,
    clarificationContent: @Composable (status: String, compactLayout: Boolean) -> Unit = { status, compactLayout ->
        SelfServiceScanPanelContent(
            isSmallScreen = compactLayout,
            scanStatus = status,
            title = stringResource(R.string.selfservice_scan_balance_title),
            subtitle = stringResource(R.string.selfservice_scan_balance_subtitle),
        )
    },
    content: @Composable (status: String, compactLayout: Boolean) -> Unit = { status, compactLayout ->
        PencilOperatorScanContent(
            scanStatus = status,
            showStatusPanel = false,
            isSmallScreen = compactLayout,
        )
    },
) {
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }

    if (state.isOpen()) {
        val deviceConfig = deviceConfigProvider.getDeviceConfig()
        val configuration = LocalConfiguration.current
        // Handhelds like Sunmi L2s Pro may report a neutral MODEL (e.g. T8920); also cap to viewport so the card never needs scrolling.
        val effectiveSmallScreen = deviceConfig.isSmallScreen ||
            configuration.smallestScreenWidthDp <= 420 ||
            configuration.screenHeightDp <= 620
        val maxDialogWidth = (configuration.screenWidthDp * 0.94f).dp
        val maxDialogHeight = (configuration.screenHeightDp * 0.90f).dp

        val adjustedWidth = when {
            // Keep clarification dialogs aligned with the proven AccountScan card geometry.
            showClarification && effectiveSmallScreen -> 380.dp
            showClarification -> 430.dp
            variant == NfcScanDialogVariant.Default && effectiveSmallScreen -> 380.dp
            variant == NfcScanDialogVariant.Default -> 430.dp
            variant == NfcScanDialogVariant.Operator && effectiveSmallScreen -> 380.dp
            variant == NfcScanDialogVariant.Operator -> 430.dp
            else -> (350 * deviceConfig.nfcScanDialogScale).dp
        }.coerceAtMost(maxDialogWidth)

        val adjustedHeight = when {
            // Match AccountScan dimensions so the self-service scan panel fits on handhelds.
            showClarification && effectiveSmallScreen -> 380.dp
            showClarification -> 440.dp
            variant == NfcScanDialogVariant.Default && effectiveSmallScreen -> 300.dp
            variant == NfcScanDialogVariant.Default -> 360.dp
            variant == NfcScanDialogVariant.Operator && effectiveSmallScreen -> 380.dp
            variant == NfcScanDialogVariant.Operator -> 440.dp
            else -> (350 * deviceConfig.nfcScanDialogScale).dp
        }.coerceAtMost(maxDialogHeight)

        Dialog(
            onDismissRequest = {
                viewModel.stopScan()
                state.close()
                onDismiss()
            },
            properties = DialogProperties(
                dismissOnBackPress = dismissOnBackPress,
                dismissOnClickOutside = dismissOnClickOutside,
                usePlatformDefaultWidth = false
            )
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                val scanCardModifier = Modifier
                    .then(modifier)
                    .size(width = adjustedWidth, height = adjustedHeight)
                    .then(
                        if (deviceConfig.isIminFalcons2) {
                            Modifier.offset(
                                x = deviceConfig.nfcScanDialogOffset.x,
                                y = deviceConfig.nfcScanDialogOffset.y,
                            )
                        } else {
                            Modifier
                        }
                    )

                if (showClarification) {
                    NfcScanCard(
                        modifier = scanCardModifier,
                        viewModel = viewModel,
                        border = border ?: BorderStroke(2.dp, SelfServicePalette.panelBorder),
                        backgroundColor = SelfServicePalette.panel,
                        shape = RoundedCornerShape(if (effectiveSmallScreen) 16.dp else 20.dp),
                        checkScan = checkScan,
                        showStatus = false,
                        showCloseButton = true,
                        onScan = { tag ->
                            onScan(tag)
                            state.close()
                        },
                        onCancel = {
                            viewModel.stopScan()
                            state.close()
                            onDismiss()
                        },
                        content = { status ->
                            clarificationContent(status, effectiveSmallScreen)
                        },
                    )
                } else {
                    NfcScanCard(
                        modifier = scanCardModifier,
                        viewModel = viewModel,
                        showCloseButton = true,
                        border = border ?: BorderStroke(
                            2.dp,
                            if (variant == NfcScanDialogVariant.Operator) {
                                OperatorPalette.panelBorder
                            } else {
                                SelfServicePalette.panelBorder
                            }
                        ),
                        backgroundColor = when (variant) {
                            NfcScanDialogVariant.Operator -> OperatorPalette.panelMuted
                            NfcScanDialogVariant.Default -> OperatorPalette.panelMuted
                        },
                        shape = RoundedCornerShape(if (effectiveSmallScreen) 18.dp else 22.dp),
                        checkScan = checkScan,
                        showStatus = false,
                        onScan = { tag ->
                            onScan(tag)
                            state.close()
                        },
                        onCancel = {
                            viewModel.stopScan()
                            state.close()
                            onDismiss()
                        },
                        content = { status ->
                            when (variant) {
                                NfcScanDialogVariant.Default -> content(status, effectiveSmallScreen)
                                NfcScanDialogVariant.Operator -> PencilOperatorScanContent(
                                    isSmallScreen = effectiveSmallScreen,
                                    scanStatus = status,
                                    showStatusPanel = false,
                                )
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun SelfServiceScanPanelContent(
    isSmallScreen: Boolean,
    scanStatus: String,
    title: String,
    subtitle: String,
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
            text = title,
            color = SelfServicePalette.title,
            fontWeight = FontWeight.Bold,
            fontSize = if (isSmallScreen) 24.sp else 34.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = subtitle,
            color = SelfServicePalette.subtitle,
            fontWeight = FontWeight.Medium,
            fontSize = if (isSmallScreen) 14.sp else 20.sp,
            textAlign = TextAlign.Center
        )

        Box(
            modifier = Modifier
                .size(outerSize)
                .background(TfPayBluePalette.elevated, CircleShape)
                .padding(midPadding),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(TfPayBluePalette.elevatedStrong, CircleShape)
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
                        tint = SelfServicePalette.accentText,
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

    val centerSize = if (isSmallScreen) 120.dp else 180.dp
    val outerPadding = if (isSmallScreen) 22.dp else 28.dp
    val midPadding = if (isSmallScreen) 20.dp else 24.dp
    val nearIconSize = if (isSmallScreen) 24.dp else 34.dp
    val instruction = stringResource(R.string.topup_scan_instruction)
    val statusText = scanStatus.ifBlank { stringResource(R.string.topup_ready_to_scan) }
    val panelShape = RoundedCornerShape(if (isSmallScreen) 20.dp else 24.dp)
    val footerShape = RoundedCornerShape(16.dp)

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 10.dp else 14.dp)
    ) {
        SelfServiceSectionHeader(
            title = stringResource(R.string.selfservice_topup),
            subtitle = stringResource(R.string.topup_step_scan),
            titleFontSize = if (isSmallScreen) 30.sp else 40.sp,
            subtitleFontSize = if (isSmallScreen) 14.sp else 18.sp,
            showLanguageSelector = false
        )

        PencilScanStepper(isSmallScreen = isSmallScreen)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(SelfServicePalette.panel, panelShape)
                .border(1.5.dp, SelfServicePalette.panelBorder, panelShape)
                .padding(if (isSmallScreen) 18.dp else 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 10.dp else 14.dp)
        ) {
            if (isSmallScreen) {
                PencilScanRadar(
                    centerSize = centerSize,
                    outerPadding = outerPadding,
                    midPadding = midPadding,
                    nearIconSize = nearIconSize,
                    pulseScale = pulseScale
                )
            } else {
                Text(
                    text = stringResource(R.string.selfservice_scan_balance_title),
                    color = SelfServicePalette.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 34.sp,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = instruction,
                    color = SelfServicePalette.subtitle,
                    fontWeight = FontWeight.Medium,
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.size(4.dp))
                PencilScanRadar(
                    centerSize = centerSize,
                    outerPadding = outerPadding,
                    midPadding = midPadding,
                    nearIconSize = nearIconSize,
                    pulseScale = pulseScale
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(SelfServicePalette.panelMuted, footerShape)
                .border(1.5.dp, SelfServicePalette.panelBorder, footerShape)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Text(
                text = statusText,
                color = SelfServicePalette.subtitle,
                fontWeight = FontWeight.Medium,
                fontSize = if (isSmallScreen) 13.sp else 16.sp
            )
        }
    }
}

@Composable
fun PencilOperatorScanContent(
    scanStatus: String,
    title: String = stringResource(R.string.nfc_scan_title_plain),
    subtitle: String = stringResource(R.string.topup_scan_instruction),
    isSmallScreen: Boolean? = null,
    showStatusPanel: Boolean = true,
) {
    val context = LocalContext.current
    val compact = isSmallScreen ?: remember(context) {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider().getDeviceConfig().isSmallScreen
    }

    val infiniteTransition = rememberInfiniteTransition()
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(900),
            repeatMode = RepeatMode.Reverse
        )
    )

    val centerSize = if (compact) 120.dp else 168.dp
    val outerPadding = if (compact) 22.dp else 26.dp
    val midPadding = if (compact) 20.dp else 22.dp
    val nearIconSize = if (compact) 24.dp else 32.dp
    val panelShape = RoundedCornerShape(if (compact) 20.dp else 24.dp)
    val statusText = scanStatus.ifBlank { stringResource(R.string.topup_ready_to_scan) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(if (compact) 10.dp else 14.dp)
    ) {
        Text(
            text = title,
            color = OperatorPalette.title,
            fontWeight = FontWeight.ExtraBold,
            fontSize = if (compact) 28.sp else 34.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = subtitle,
            color = OperatorPalette.subtitle,
            fontWeight = FontWeight.Medium,
            fontSize = if (compact) 12.sp else 15.sp,
            textAlign = TextAlign.Center
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(OperatorPalette.panel, panelShape)
                .border(1.5.dp, OperatorPalette.panelBorder, panelShape)
                .padding(if (compact) 18.dp else 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (compact) 10.dp else 14.dp)
        ) {
            PencilScanRadar(
                centerSize = centerSize,
                outerPadding = outerPadding,
                midPadding = midPadding,
                nearIconSize = nearIconSize,
                pulseScale = pulseScale
            )
        }

        if (showStatusPanel) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(OperatorPalette.panelMuted, RoundedCornerShape(16.dp))
                    .border(1.5.dp, OperatorPalette.panelBorder, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = statusText,
                    color = OperatorPalette.subtitle,
                    fontWeight = FontWeight.Medium,
                    fontSize = if (compact) 13.sp else 16.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun PencilCustomerDisplayScanContent(
    scanStatus: String,
    title: String = stringResource(R.string.nfc_scan_title_plain),
    subtitle: String = stringResource(R.string.nfc_scan_description),
    isSmallScreen: Boolean = false,
) {
    val statusText = scanStatus.ifBlank { stringResource(R.string.topup_ready_to_scan) }
    val outerShape = RoundedCornerShape(if (isSmallScreen) 20.dp else 24.dp)
    val cardShape = RoundedCornerShape(if (isSmallScreen) 18.dp else 22.dp)
    val iconPanelShape = RoundedCornerShape(if (isSmallScreen) 20.dp else 24.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFFF9FBFF), Color(0xFFE2ECFF))
                ),
                shape = outerShape
            )
            .padding(if (isSmallScreen) 18.dp else 24.dp),
        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 12.dp else 16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, cardShape)
                .border(2.dp, Color(0xFFBFD1F3), cardShape)
                .padding(if (isSmallScreen) 18.dp else 26.dp),
            horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 18.dp else 32.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 10.dp else 16.dp)
            ) {
                Text(
                    text = "CUSTOMER DISPLAY",
                    color = Color(0xFF44556B),
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = if (isSmallScreen) 12.sp else 14.sp,
                    letterSpacing = 1.sp
                )
                Text(
                    text = title,
                    color = Color(0xFF0D1B2A),
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = if (isSmallScreen) 26.sp else 34.sp,
                    lineHeight = if (isSmallScreen) 28.sp else 36.sp
                )
                Text(
                    text = subtitle,
                    color = Color(0xFF44556B),
                    fontWeight = FontWeight.Medium,
                    fontSize = if (isSmallScreen) 14.sp else 18.sp,
                    lineHeight = if (isSmallScreen) 18.sp else 24.sp
                )
                Text(
                    text = statusText,
                    color = Color(0xFF44556B),
                    fontWeight = FontWeight.Medium,
                    fontSize = if (isSmallScreen) 13.sp else 16.sp,
                    lineHeight = if (isSmallScreen) 18.sp else 22.sp
                )
            }

            Box(
                modifier = Modifier
                    .width(if (isSmallScreen) 110.dp else 150.dp)
                    .height(if (isSmallScreen) 150.dp else 210.dp)
                    .background(Color(0xFF0D1B2A), iconPanelShape)
                    .padding(if (isSmallScreen) 18.dp else 24.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Rounded.Contactless,
                    contentDescription = stringResource(R.string.nfc_icon_description),
                    tint = Color(0xFFFF9F1C),
                    modifier = Modifier.size(if (isSmallScreen) 56.dp else 84.dp)
                )
            }
        }
    }
}

@Composable
private fun PencilScanRadar(
    centerSize: androidx.compose.ui.unit.Dp,
    outerPadding: androidx.compose.ui.unit.Dp,
    midPadding: androidx.compose.ui.unit.Dp,
    nearIconSize: androidx.compose.ui.unit.Dp,
    pulseScale: Float,
) {
    Box(
        modifier = Modifier
            .size(centerSize)
            .background(TfPayBluePalette.elevated, CircleShape)
            .padding(outerPadding),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(TfPayBluePalette.elevatedStrong, CircleShape)
                .padding(midPadding),
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
                    tint = SelfServicePalette.accentText,
                    modifier = Modifier.size(nearIconSize)
                )
            }
        }
    }
}

@Composable
private fun PencilScanStepper(isSmallScreen: Boolean) {
    val steps = listOf(
        Pair(stringResource(R.string.topup_step_amount).substringAfter(": "), 1),
        Pair(stringResource(R.string.topup_step_scan).substringAfter(": "), 2),
        Pair(stringResource(R.string.topup_step_payment).substringAfter(": "), 3)
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 8.dp)
    ) {
        steps.forEach { (label, stepNumber) ->
            val isDone = stepNumber < 2
            val isActive = stepNumber == 2
            val background = when {
                isDone -> SelfServicePalette.successPanel
                isActive -> TfPayBluePalette.elevated
                else -> SelfServicePalette.panelMuted
            }
            val textColor = when {
                isDone -> SelfServicePalette.successMuted
                isActive -> SelfServicePalette.title
                else -> SelfServicePalette.subtitle
            }
            val indicatorColor = when {
                isDone -> SelfServicePalette.success
                isActive -> SelfServicePalette.accent
                else -> SelfServicePalette.panelBorder
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(background, RoundedCornerShape(12.dp))
                    .border(
                        1.5.dp,
                        if (isDone) SelfServicePalette.success else SelfServicePalette.panelBorder,
                        RoundedCornerShape(12.dp)
                    )
                    .padding(horizontal = if (isSmallScreen) 8.dp else 10.dp, vertical = 10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(if (isSmallScreen) 20.dp else 22.dp)
                            .background(indicatorColor, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isDone) {
                            Icon(
                                imageVector = Icons.Filled.Check,
                                contentDescription = null,
                                tint = SelfServicePalette.accentText,
                                modifier = Modifier.size(14.dp)
                            )
                        } else {
                            Text(
                                text = stepNumber.toString(),
                                color = SelfServicePalette.accentText,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                    Text(
                        text = label,
                        color = textColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = if (isSmallScreen) 11.sp else 13.sp,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}
