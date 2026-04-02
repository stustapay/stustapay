package de.stustapay.stustapay.ui.settings

import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.device.ManagedWifiConfig
import de.stustapay.stustapay.device.ManagedWifiSuggestionState
import de.stustapay.stustapay.device.buildWifiNetworkSuggestion
import de.stustapay.stustapay.repository.ForceDeregisterState
import de.stustapay.stustapay.ui.barcode.QRScanView
import de.stustapay.stustapay.ui.common.PrefGroup
import de.stustapay.stustapay.ui.settings.RegistrationUiState.*
import de.stustapay.libssp.ui.theme.errorButtonColors
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
                Text(text = "Deregister Terminal")
            },
            text = {
                Text("Do you really want do remove the terminal's server association?")
            },
            onDismissRequest = { showConfirm = false },
            confirmButton = {
                Button(
                    colors = errorButtonColors(),
                    onClick = {
                        showForceConfirm = true
                        onDeregister()
                        showConfirm = false
                    }) {
                    Text("Yes")
                }
            },
            dismissButton = {
                Button(
                    onClick = {
                        showConfirm = false
                    }) {
                    Text("Abort deregistration")
                }
            }
        )
    } else if (allowForceDeregister is ForceDeregisterState.Allow && showForceConfirm) {
        AlertDialog(
            title = {
                Text(text = "Force Terminal Deregistration")
            },
            text = {
                Text("Could not deregister at the server: ${allowForceDeregister.msg}\nForce-Deregister?")
            },
            onDismissRequest = { showForceConfirm = false },
            confirmButton = {
                Button(
                    colors = errorButtonColors(),
                    onClick = {
                        onForceDeregister()
                    }) {
                    Text("Yes")
                }
            },
            dismissButton = {
                Button(
                    onClick = {
                        showForceConfirm = false
                    }) {
                    Text("Abort")
                }
            }
        )
    }

    Button(
        modifier = Modifier.padding(start = 10.dp, end = 10.dp),
        onClick = {
            showConfirm = true
        },
        colors = errorButtonColors()
    ) {
        Text(text = "Deregister Terminal")
    }
}


@Composable
fun RegistrationOverview(
    scope: CoroutineScope,
    navController: NavController,
    registrationUiState: RegistrationUiState,
    wifiSuggestionState: ManagedWifiSuggestionState,
    onRetryWifiSuggestion: () -> Unit,
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
) {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        PrefGroup(title = { Text("Server Connection") }) {

            var endpointUrl: String? = null
            var message: String? = null
            when (registrationUiState) {
                Idle -> {
                    message = "waiting for input"
                }
                is Message -> {
                    message = registrationUiState.msg
                }
                is HasEndpoint -> {
                    endpointUrl = registrationUiState.endpointUrl
                    message = registrationUiState.msg
                }
            }

            Column {
                Text(
                    text = message!!,
                    modifier = Modifier.padding(start = 15.dp, end = 10.dp)
                )
                Text(
                    text = "endpoint: ${endpointUrl ?: "not connected"}",
                    modifier = Modifier.padding(start = 15.dp, end = 10.dp),
                )
            }

            Spacer(modifier = Modifier.height(15.dp))

            Row {
                if (registrationUiState is HasEndpoint) {
                    Registered(
                        onDeregister = onDeregister,
                        allowForceDeregister = allowForceDeregister,
                        onForceDeregister = onForceDeregister,
                    )
                } else {
                    Button(modifier = Modifier.padding(start = 10.dp, end = 10.dp), onClick = {
                        scope.launch {
                            navController.navigate("scan")
                        }
                    }) {
                        Text(text = "Scan Registration QR Code")
                    }
                }
            }
        }

        PrefGroup(title = { Text(stringResource(R.string.settings_wifi_title)) }) {
            val wifiConfig = wifiSuggestionState.desiredConfig
            var revealPassphrase by remember { mutableStateOf(false) }

            if (wifiConfig == null) {
                Text(
                    text = stringResource(R.string.settings_wifi_none),
                    modifier = Modifier.padding(start = 15.dp, end = 10.dp)
                )
            } else {
                Column(
                    modifier = Modifier.padding(start = 15.dp, end = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(text = stringResource(R.string.settings_wifi_ssid, wifiConfig.ssid))
                    Text(
                        text = stringResource(
                            R.string.settings_wifi_passphrase,
                            if (revealPassphrase) wifiConfig.passphrase else "••••••••"
                        )
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
                        Text(text = stringResource(R.string.settings_wifi_success))
                    }
                }

                Spacer(modifier = Modifier.height(15.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        modifier = Modifier.padding(start = 10.dp),
                        onClick = onRetryWifiSuggestion,
                    ) {
                        Text(text = stringResource(R.string.settings_wifi_retry))
                    }
                    OutlinedButton(
                        modifier = Modifier.padding(end = 10.dp),
                        onClick = { openWifiSetup(context, wifiConfig) },
                    ) {
                        Text(text = stringResource(R.string.settings_wifi_open_setup))
                    }
                }
            }
        }
    }
}

private fun openWifiSetup(context: android.content.Context, wifiConfig: ManagedWifiConfig) {
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
fun RegistrationView(viewModel: RegistrationViewModel = hiltViewModel()) {

    // when the registrationUiState flow changes, re-draw this function (collect)
    // we only want the latest value of the flow, i.e. a state (asState)
    // we want to pause subscription when the application is no longer visible (withLifecycle)
    val registrationUiState: RegistrationUiState by viewModel.registrationUiState.collectAsStateWithLifecycle()

    val allowForceDeregister: ForceDeregisterState by viewModel.allowForceDeregister.collectAsStateWithLifecycle()
    val wifiSuggestionState by viewModel.wifiSuggestionState.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "register",
        modifier = Modifier
            .fillMaxSize()
    ) {
        composable("register") {
            RegistrationOverview(
                scope = scope,
                navController = navController,
                registrationUiState = registrationUiState,
                wifiSuggestionState = wifiSuggestionState,
                onRetryWifiSuggestion = { scope.launch { viewModel.retryWifiSuggestion() } },
                onDeregister = { scope.launch { viewModel.deregister() } },
                allowForceDeregister = allowForceDeregister,
                onForceDeregister = { scope.launch { viewModel.deregister(force = true) } },
            )
        }
        composable("scan") {
            QRScanView { qrcode ->
                scope.launch {
                    viewModel.register(qrcode)
                }
                navController.navigate("register")
            }
        }
    }
}
