package de.stustapay.stustapay.ui.entry

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.api.models.EntryDirection
import de.stustapay.api.models.EntryScanResult
import de.stustapay.api.models.TerminalMode
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.common.FailureIcon
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.SuccessIcon
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint
import kotlinx.coroutines.launch

@Composable
fun EntryView(
    leaveView: () -> Unit,
    viewModel: EntryViewModel = hiltViewModel(),
) {
    val scope = rememberCoroutineScope()
    val terminalState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val scanResult by viewModel.scanResult.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    val deviceConfig = deviceConfigProvider.getDeviceConfig()

    val mode = terminalState.terminalMode()
    val scanLabel = when (mode) {
        TerminalMode.exit -> stringResource(R.string.entry_scan_exit)
        TerminalMode.entry -> stringResource(R.string.entry_scan_entry)
        else -> stringResource(R.string.entry_scan_entry)
    }
    val scanCardSize = (350 * deviceConfig.nfcScanDialogScale).dp

    OperatorScaffold(
        title = terminalState.title().title,
        subtitle = scanLabel,
        icon = Icons.Filled.MeetingRoom,
        terminalLabel = when (mode) {
            TerminalMode.entry -> "Entry"
            TerminalMode.exit -> "Exit"
            else -> "Access"
        },
        footerHint = if (status.isNotBlank()) {
            status
        } else {
            "Hold a wristband near the reader to resolve access for this terminal mode."
        },
        footerSection = "Entry",
        footerStatus = when {
            requestActive -> "Checking"
            scanResult?.allowed == true -> "Allowed"
            scanResult?.allowed == false -> "Denied"
            else -> "Ready"
        },
        onBack = leaveView,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                NfcScanCard(
                    modifier = Modifier
                        .size(scanCardSize, scanCardSize)
                        .offset(
                            x = if (deviceConfig.useCenteredDialog) 0.dp else deviceConfig.nfcScanDialogOffset.x,
                            y = if (deviceConfig.useCenteredDialog) 0.dp else deviceConfig.nfcScanDialogOffset.y
                        ),
                    onScan = { tag ->
                        scope.launch {
                            viewModel.tagScanned(tag)
                        }
                    },
                    scan = !requestActive,
                    keepScanning = true,
                    showStatus = false,
                    border = BorderStroke(2.dp, OperatorPalette.panelBorder),
                    backgroundColor = OperatorPalette.panelMuted,
                ) {
                    PencilOperatorScanContent(
                        title = scanLabel,
                        subtitle = stringResource(R.string.nfc_scan_description),
                        scanStatus = it,
                        isSmallScreen = deviceConfig.isSmallScreen
                    )
                }
            }

            if (scanResult != null) {
                EntryResultCard(result = scanResult!!, status = status)
            } else if (status.isNotBlank()) {
                OperatorInfoCard(
                    title = "Scan status",
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(text = status, color = OperatorPalette.subtitle)
                }
            }
        }
    }
}

@Composable
private fun EntryResultCard(result: EntryScanResult, status: String) {
    val accent = if (result.allowed) OperatorPalette.success else OperatorPalette.danger
    val directionLabel = if (result.direction == EntryDirection.entry) {
        stringResource(R.string.entry_direction_entry)
    } else {
        stringResource(R.string.entry_direction_exit)
    }
    val heading = if (result.allowed) {
        stringResource(R.string.entry_status_allowed)
    } else {
        stringResource(R.string.entry_status_denied)
    }

    OperatorPanel(
        modifier = Modifier.fillMaxWidth(),
        borderColor = accent,
        backgroundColor = if (result.allowed) OperatorPalette.successPanel else OperatorPalette.panel,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (result.allowed) {
                    SuccessIcon(modifier = Modifier.size(40.dp))
                } else {
                    FailureIcon(modifier = Modifier.size(40.dp))
                }
                Column {
                    Text(text = heading, color = OperatorPalette.title, fontSize = 24.sp)
                    Text(text = directionLabel, color = OperatorPalette.subtitle, fontSize = 16.sp)
                }
            }

            EntryResultRow(label = stringResource(R.string.entry_label_area), value = result.areaName)
            EntryResultRow(label = stringResource(R.string.entry_label_group), value = result.groupName)
            EntryResultRow(label = stringResource(R.string.entry_label_reason), value = status)
        }
    }
}

@Composable
private fun EntryResultRow(label: String, value: String?) {
    if (value.isNullOrBlank()) {
        return
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = label, color = OperatorPalette.subtitle, fontSize = 16.sp)
        Text(text = value, color = OperatorPalette.title, fontSize = 16.sp)
    }
}
