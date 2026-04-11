package de.stustapay.stustapay.ui.settings

import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.AlertDialog
import androidx.compose.material.Button
import androidx.compose.material.MaterialTheme
import androidx.compose.material.OutlinedButton
import androidx.compose.material.Text
import androidx.compose.material.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.libssp.ui.theme.errorButtonColors
import de.stustapay.stustapay.R
import de.stustapay.stustapay.device.ManagedWifiConfig
import de.stustapay.stustapay.device.ManagedWifiSuggestionState
import de.stustapay.stustapay.device.buildWifiNetworkSuggestion
import de.stustapay.stustapay.model.RegistrationSource
import de.stustapay.stustapay.repository.ForceDeregisterState
import de.stustapay.stustapay.ui.barcode.QRScanView
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import de.stustapay.stustapay.ui.settings.RegistrationUiState.HasEndpoint
import de.stustapay.stustapay.ui.settings.RegistrationUiState.Idle
import de.stustapay.stustapay.ui.settings.RegistrationUiState.Message
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Composable
fun Registered(
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
) {
    var showConfirm by remember { mutableStateOf(false) }
    var showForceConfirm by remember { mutableStateOf(false) }

    if (showConfirm) {
        AlertDialog(
            title = {
                Text(text = stringResource(R.string.registration_deregister))
            },
            text = {
                Text(stringResource(R.string.registration_deregister_confirm))
            },
            onDismissRequest = { showConfirm = false },
            confirmButton = {
                Button(
                    colors = errorButtonColors(),
                    onClick = {
                        showForceConfirm = true
                        onDeregister()
                        showConfirm = false
                    }
                ) {
                    Text(stringResource(R.string.common_yes))
                }
            },
            dismissButton = {
                Button(
                    onClick = {
                        showConfirm = false
                    }
                ) {
                    Text(stringResource(R.string.registration_abort_deregistration))
                }
            }
        )
    } else if (allowForceDeregister is ForceDeregisterState.Allow && showForceConfirm) {
        AlertDialog(
            title = {
                Text(text = stringResource(R.string.registration_force_deregister))
            },
            text = {
                Text(
                    stringResource(
                        R.string.registration_force_deregister_confirm,
                        allowForceDeregister.msg,
                    )
                )
            },
            onDismissRequest = { showForceConfirm = false },
            confirmButton = {
                Button(
                    colors = errorButtonColors(),
                    onClick = {
                        onForceDeregister()
                    }
                ) {
                    Text(stringResource(R.string.common_yes))
                }
            },
            dismissButton = {
                Button(
                    onClick = {
                        showForceConfirm = false
                    }
                ) {
                    Text(stringResource(R.string.registration_abort))
                }
            }
        )
    }

    Button(
        modifier = Modifier.fillMaxWidth(),
        onClick = {
            showConfirm = true
        },
        colors = errorButtonColors()
    ) {
        Text(text = stringResource(R.string.registration_deregister))
    }
}

@Composable
fun RegistrationOverview(
    scope: CoroutineScope,
    navController: NavController,
    registrationUiState: RegistrationUiState,
    managedConfigOverrideActive: Boolean,
    wifiSuggestionState: ManagedWifiSuggestionState,
    onRetryWifiSuggestion: () -> Unit,
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
    onReenableManagedConfig: () -> Unit,
) {
    var endpointUrl: String? = null
    var message = stringResource(R.string.registration_waiting_input)
    var source = RegistrationSource.UNKNOWN
    var manualOverrideActive = managedConfigOverrideActive

    when (registrationUiState) {
        Idle -> Unit
        is Message -> {
            message = registrationUiState.msg
            manualOverrideActive = manualOverrideActive || registrationUiState.managedConfigDisabled
        }

        is HasEndpoint -> {
            endpointUrl = registrationUiState.endpointUrl
            message = registrationUiState.msg.orEmpty()
            source = registrationUiState.source
            manualOverrideActive = manualOverrideActive || registrationUiState.managedConfigDisabled
        }
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val compactLayout = maxWidth < 760.dp

        if (compactLayout) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                RegistrationStatusCard(
                    message = message,
                    endpointUrl = endpointUrl,
                    source = source,
                    manualOverrideActive = manualOverrideActive,
                    modifier = Modifier.fillMaxWidth(),
                )
                ManagedWifiCard(
                    wifiSuggestionState = wifiSuggestionState,
                    onRetryWifiSuggestion = onRetryWifiSuggestion,
                    modifier = Modifier.fillMaxWidth(),
                )
                RegistrationActionArea(
                    scope = scope,
                    navController = navController,
                    registrationUiState = registrationUiState,
                    manualOverrideActive = manualOverrideActive,
                    onDeregister = onDeregister,
                    allowForceDeregister = allowForceDeregister,
                    onForceDeregister = onForceDeregister,
                    onReenableManagedConfig = onReenableManagedConfig,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                RegistrationStatusCard(
                    message = message,
                    endpointUrl = endpointUrl,
                    source = source,
                    manualOverrideActive = manualOverrideActive,
                    modifier = Modifier.weight(1f),
                )
                Column(
                    modifier = Modifier
                        .weight(0.55f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    ManagedWifiCard(
                        wifiSuggestionState = wifiSuggestionState,
                        onRetryWifiSuggestion = onRetryWifiSuggestion,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    RegistrationActionArea(
                        scope = scope,
                        navController = navController,
                        registrationUiState = registrationUiState,
                        manualOverrideActive = manualOverrideActive,
                        onDeregister = onDeregister,
                        allowForceDeregister = allowForceDeregister,
                        onForceDeregister = onForceDeregister,
                        onReenableManagedConfig = onReenableManagedConfig,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun RegistrationStatusCard(
    message: String,
    endpointUrl: String?,
    source: RegistrationSource,
    manualOverrideActive: Boolean,
    modifier: Modifier = Modifier,
) {
    OperatorInfoCard(
        title = stringResource(R.string.registration_status_title),
        modifier = modifier,
    ) {
        Text(
            text = stringResource(R.string.registration_status_message, message),
            color = OperatorPalette.title,
        )
        Text(
            text = stringResource(
                R.string.registration_status_endpoint,
                endpointUrl ?: stringResource(R.string.registration_status_not_connected),
            ),
            color = OperatorPalette.subtitle,
        )
        Text(
            text = stringResource(R.string.registration_status_source, registrationSourceLabel(source)),
            color = OperatorPalette.subtitle,
        )
        if (manualOverrideActive) {
            Text(
                text = stringResource(R.string.registration_managed_override_active),
                color = OperatorPalette.title,
                fontWeight = FontWeight.Medium,
            )
        }
        Text(
            text = stringResource(R.string.registration_status_force_hint),
            color = OperatorPalette.subtitle,
        )
    }
}

@Composable
private fun ManagedWifiCard(
    wifiSuggestionState: ManagedWifiSuggestionState,
    onRetryWifiSuggestion: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val wifiConfig = wifiSuggestionState.desiredConfig
    var revealPassphrase by remember { mutableStateOf(false) }

    OperatorInfoCard(
        title = stringResource(R.string.settings_wifi_title),
        modifier = modifier,
    ) {
        if (wifiConfig == null) {
            Text(
                text = stringResource(R.string.settings_wifi_none),
                color = OperatorPalette.subtitle,
            )
            return@OperatorInfoCard
        }

        Text(
            text = stringResource(R.string.settings_wifi_ssid, wifiConfig.ssid),
            color = OperatorPalette.title,
        )
        Text(
            text = stringResource(
                R.string.settings_wifi_passphrase,
                if (revealPassphrase) wifiConfig.passphrase else "••••••••",
            ),
            color = OperatorPalette.subtitle,
        )
        TextButton(onClick = { revealPassphrase = !revealPassphrase }) {
            Text(
                text = stringResource(
                    if (revealPassphrase) {
                        R.string.settings_wifi_hide_passphrase
                    } else {
                        R.string.settings_wifi_show_passphrase
                    }
                )
            )
        }

        val errorMessage = wifiSuggestionState.lastErrorMessage
        if (errorMessage != null) {
            Text(
                text = stringResource(R.string.settings_wifi_error, errorMessage),
                color = MaterialTheme.colors.error,
            )
        } else {
            Text(
                text = stringResource(R.string.settings_wifi_success),
                color = OperatorPalette.subtitle,
            )
        }

        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val stackedActions = maxWidth < 420.dp

            if (stackedActions) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = onRetryWifiSuggestion,
                    ) {
                        Text(text = stringResource(R.string.settings_wifi_retry))
                    }
                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { openWifiSetup(context, wifiConfig) },
                    ) {
                        Text(text = stringResource(R.string.settings_wifi_open_setup))
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Button(
                        modifier = Modifier.weight(1f),
                        onClick = onRetryWifiSuggestion,
                    ) {
                        Text(text = stringResource(R.string.settings_wifi_retry))
                    }
                    OutlinedButton(
                        modifier = Modifier.weight(1f),
                        onClick = { openWifiSetup(context, wifiConfig) },
                    ) {
                        Text(text = stringResource(R.string.settings_wifi_open_setup))
                    }
                }
            }
        }
    }
}

@Composable
private fun RegistrationActionArea(
    scope: CoroutineScope,
    navController: NavController,
    registrationUiState: RegistrationUiState,
    manualOverrideActive: Boolean,
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
    onReenableManagedConfig: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (registrationUiState is HasEndpoint) {
            Registered(
                onDeregister = onDeregister,
                allowForceDeregister = allowForceDeregister,
                onForceDeregister = onForceDeregister,
            )
        } else {
            OperatorPrimaryButton(
                text = stringResource(R.string.registration_scan_qr),
                icon = Icons.Filled.QrCode2,
                onClick = {
                    scope.launch {
                        navController.navigate("scan")
                    }
                },
            )
        }

        if (manualOverrideActive) {
            OperatorSecondaryButton(
                text = stringResource(R.string.registration_allow_managed_config),
                icon = Icons.Filled.Link,
                onClick = onReenableManagedConfig,
            )
        }
    }
}

private fun openWifiSetup(context: Context, wifiConfig: ManagedWifiConfig) {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Intent(Settings.ACTION_WIFI_ADD_NETWORKS).apply {
            putParcelableArrayListExtra(
                Settings.EXTRA_WIFI_NETWORK_LIST,
                arrayListOf(buildWifiNetworkSuggestion(wifiConfig))
            )
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    } else {
        Intent(Settings.ACTION_WIFI_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }
    context.startActivity(intent)
}

@Preview
@Composable
fun RegistrationView(
    navigateBack: () -> Unit = {},
    viewModel: RegistrationViewModel = hiltViewModel(),
) {
    val registrationUiState: RegistrationUiState by viewModel.registrationUiState.collectAsStateWithLifecycle()
    val allowForceDeregister: ForceDeregisterState by viewModel.allowForceDeregister.collectAsStateWithLifecycle()
    val wifiSuggestionState by viewModel.wifiSuggestionState.collectAsStateWithLifecycle()
    val managedConfigOverrideActive by viewModel.managedConfigOverrideActive.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "register",
        modifier = Modifier.fillMaxSize()
    ) {
        composable("register") {
            OperatorScaffold(
                title = stringResource(R.string.registration_title),
                subtitle = stringResource(R.string.registration_subtitle),
                icon = Icons.Filled.Link,
                terminalLabel = stringResource(R.string.registration_terminal_label),
                footerHint = stringResource(R.string.registration_footer_hint),
                footerSection = stringResource(R.string.registration_footer_section),
                footerStatus = if (registrationUiState is HasEndpoint) {
                    stringResource(R.string.registration_footer_registered)
                } else {
                    stringResource(R.string.registration_footer_waiting_qr)
                },
                onBack = navigateBack,
            ) {
                RegistrationOverview(
                    scope = scope,
                    navController = navController,
                    registrationUiState = registrationUiState,
                    managedConfigOverrideActive = managedConfigOverrideActive,
                    wifiSuggestionState = wifiSuggestionState,
                    onRetryWifiSuggestion = { scope.launch { viewModel.retryWifiSuggestion() } },
                    onDeregister = { scope.launch { viewModel.deregister() } },
                    allowForceDeregister = allowForceDeregister,
                    onForceDeregister = { scope.launch { viewModel.deregister(force = true) } },
                    onReenableManagedConfig = { scope.launch { viewModel.reenableManagedConfig() } },
                )
            }
        }
        composable("scan") {
            OperatorScaffold(
                title = stringResource(R.string.registration_scan_title),
                subtitle = stringResource(R.string.registration_scan_subtitle),
                icon = Icons.Filled.QrCode2,
                terminalLabel = stringResource(R.string.registration_scan_terminal_label),
                footerHint = stringResource(R.string.registration_scan_footer_hint),
                footerSection = stringResource(R.string.registration_footer_section),
                footerStatus = stringResource(R.string.registration_status_scanner),
                onBack = { navController.popBackStack() },
            ) {
                QRScanView { qrcode ->
                    scope.launch {
                        viewModel.register(qrcode)
                    }
                    navController.navigate("register")
                }
            }
        }
    }
}

@Composable
private fun registrationSourceLabel(source: RegistrationSource): String {
    return when (source) {
        RegistrationSource.UNKNOWN -> stringResource(R.string.registration_source_unknown)
        RegistrationSource.MANUAL -> stringResource(R.string.registration_source_manual)
        RegistrationSource.MANAGED -> stringResource(R.string.registration_source_managed)
    }
}
