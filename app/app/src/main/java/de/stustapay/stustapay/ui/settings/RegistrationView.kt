package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
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
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.repository.ForceDeregisterState
import de.stustapay.stustapay.ui.barcode.QRScanView
import de.stustapay.stustapay.ui.common.PrefGroup
import de.stustapay.stustapay.ui.settings.RegistrationUiState.*
import de.stustapay.libssp.ui.theme.errorButtonColors
import de.stustapay.stustapay.ui.barcode.QRScanDialog
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
    startScan: () -> Unit,
    registrationUiState: RegistrationUiState,
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
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
                    startScan()
                }) {
                    Text(text = "Scan Registration QR Code")
                }
            }
        }
    }
}

@Preview
@Composable
fun RegistrationView(viewModel: RegistrationViewModel = hiltViewModel()) {

    // (this was the first usage of state flows in StuStaPay :)
    // when the registrationUiState flow changes, re-draw this function (collect)
    // we only want the latest value of the flow, i.e. a state (asState)
    // we want to pause subscription when the application is no longer visible (withLifecycle)
    val registrationUiState: RegistrationUiState by viewModel.registrationUiState.collectAsStateWithLifecycle()

    val allowForceDeregister: ForceDeregisterState by viewModel.allowForceDeregister.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val registerScanState = rememberDialogDisplayState()

    QRScanDialog(
        state = registerScanState,
        onScan = { qrcode ->
            scope.launch {
                viewModel.register(qrcode)
            }
        }
    )

    RegistrationOverview(
        scope = scope,
        startScan = { registerScanState.open() },
        registrationUiState = registrationUiState,
        onDeregister = { scope.launch { viewModel.deregister() } },
        allowForceDeregister = allowForceDeregister,
        onForceDeregister = { scope.launch { viewModel.deregister(force = true) } },
    )
}
