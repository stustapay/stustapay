package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.AlertDialog
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.repository.ForceDeregisterState
import de.stustapay.stustapay.ui.barcode.QRScanView
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
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
        modifier = Modifier.fillMaxWidth(),
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
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
) {
    var endpointUrl: String? = null
    var message: String = "waiting for input"
    when (registrationUiState) {
        Idle -> Unit
        is Message -> {
            message = registrationUiState.msg.orEmpty()
        }
        is HasEndpoint -> {
            endpointUrl = registrationUiState.endpointUrl
            message = registrationUiState.msg.orEmpty()
        }
    }

    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        OperatorInfoCard(
            title = "Current terminal association",
            modifier = Modifier.weight(1f),
        ) {
            Text(text = "Message: $message", color = OperatorPalette.title)
            Text(
                text = "Endpoint: ${endpointUrl ?: "not connected"}",
                color = OperatorPalette.subtitle,
            )
            Text(
                text = "Force deregister follows only if the backend cannot remove the association.",
                color = OperatorPalette.subtitle,
            )
        }
        Column(
            modifier = Modifier.weight(0.45f),
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
                    text = "Scan registration QR code",
                    icon = Icons.Filled.QrCode2,
                    onClick = {
                        scope.launch {
                            navController.navigate("scan")
                        }
                    },
                )
            }
        }
    }
}

@Preview
@Composable
fun RegistrationView(
    navigateBack: () -> Unit = {},
    viewModel: RegistrationViewModel = hiltViewModel(),
) {

    // when the registrationUiState flow changes, re-draw this function (collect)
    // we only want the latest value of the flow, i.e. a state (asState)
    // we want to pause subscription when the application is no longer visible (withLifecycle)
    val registrationUiState: RegistrationUiState by viewModel.registrationUiState.collectAsStateWithLifecycle()

    val allowForceDeregister: ForceDeregisterState by viewModel.allowForceDeregister.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "register",
        modifier = Modifier.fillMaxSize()
    ) {
        composable("register") {
            OperatorScaffold(
                title = "Registration",
                subtitle = "Server connection state with deregistration confirmation flow.",
                icon = Icons.Filled.Link,
                terminalLabel = "Core Connection",
                footerHint = "Represents the registered state and the first deregistration confirmation from the live flow.",
                footerSection = "Registration",
                footerStatus = if (registrationUiState is HasEndpoint) "Registered" else "Awaiting QR",
                onBack = navigateBack,
            ) {
                RegistrationOverview(
                    scope = scope,
                    navController = navController,
                    registrationUiState = registrationUiState,
                    onDeregister = { scope.launch { viewModel.deregister() } },
                    allowForceDeregister = allowForceDeregister,
                    onForceDeregister = { scope.launch { viewModel.deregister(force = true) } },
                )
            }
        }
        composable("scan") {
            OperatorScaffold(
                title = "Registration Scan",
                subtitle = "Scan the backend-issued QR code to attach this terminal.",
                icon = Icons.Filled.QrCode2,
                terminalLabel = "Camera",
                footerHint = "Uses the existing QRScanView and returns directly to the registration summary after a scan.",
                footerSection = "Registration",
                footerStatus = "Scanner",
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
