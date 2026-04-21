package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanDialogVariant
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.chipscan.SelfServiceScanPanelContent
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint
import kotlinx.coroutines.delay

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
        LaunchedEffect(Unit) {
            delay(20_000)
            onBack()
        }

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
                            SelfServiceScanPanelContent(
                                isSmallScreen = profile.isSmallScreen,
                                scanStatus = status,
                                title = stringResource(R.string.selfservice_scan_balance_title),
                                subtitle = stringResource(R.string.selfservice_scan_balance_subtitle),
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
