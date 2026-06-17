package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanDialogVariant
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.chipscan.SelfServiceScanPanelContent
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import kotlinx.coroutines.delay

@Composable
fun AccountScan(
    isSelfService: Boolean = false,
    onBack: () -> Unit = {},
    onScan: (NfcTag) -> Unit
) {
    val profile = rememberSelfServiceDeviceProfile()
    val selfServiceScanState = rememberNfcScanDialogState()
    val operatorScanState = rememberNfcScanDialogState()

    if (isSelfService) {
        LaunchedEffect(Unit) {
            selfServiceScanState.open()
            delay(20_000)
            onBack()
        }

        NfcScanDialog(
            state = selfServiceScanState,
            showClarification = true,
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            onDismiss = onBack,
            onScan = onScan,
            clarificationContent = { status, compactLayout ->
                SelfServiceScanPanelContent(
                    isSmallScreen = compactLayout,
                    scanStatus = status,
                    title = stringResource(R.string.selfservice_scan_balance_title),
                    subtitle = stringResource(R.string.selfservice_scan_balance_subtitle),
                )
            },
        )

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
