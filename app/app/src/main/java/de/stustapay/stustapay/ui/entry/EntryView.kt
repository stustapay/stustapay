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
import androidx.compose.material.Card
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
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
import de.stustapay.stustapay.ui.chipscan.EnhancedNfcScanContent
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.FailureIcon
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.SuccessIcon
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint
import de.stustapay.stustapay.ui.nav.NavScaffold
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

    NavScaffold(
        title = { Text(terminalState.title().title) },
        navigateBack = leaveView,
    ) { _ ->
        Scaffold(
            content = { paddingValues ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(horizontal = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 10.dp),
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
                        ) {
                            EnhancedNfcScanContent(
                                isIminFalcons2 = deviceConfig.isIminFalcons2,
                                isSmallScreen = deviceConfig.isSmallScreen,
                                scanStatus = it,
                                headerText = scanLabel
                            )
                        }
                    }

                    if (scanResult != null) {
                        EntryResultCard(result = scanResult!!, status = status)
                    } else if (status.isNotBlank()) {
                        StatusText(status)
                    }
                }
            },
        )
    }
}

@Composable
private fun EntryResultCard(result: EntryScanResult, status: String) {
    val accent = if (result.allowed) MaterialTheme.colors.primary else MaterialTheme.colors.error
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

    Card(
        modifier = Modifier.fillMaxWidth(),
        border = BorderStroke(2.dp, accent),
        elevation = 6.dp,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
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
                    Text(text = heading, style = MaterialTheme.typography.h6)
                    Text(text = directionLabel, style = MaterialTheme.typography.body2)
                }
            }

            Spacer(modifier = Modifier.size(12.dp))

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
        Text(text = label, style = MaterialTheme.typography.body2)
        Text(text = value, style = MaterialTheme.typography.body1, fontSize = 16.sp)
    }
}
