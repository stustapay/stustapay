package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.AlertDialog
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.repository.ForceDeregisterState
import de.stustapay.stustapay.R
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
                    }) {
                    Text(stringResource(R.string.common_yes))
                }
            },
            dismissButton = {
                Button(
                    onClick = {
                        showConfirm = false
                    }) {
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
                    }) {
                    Text(stringResource(R.string.common_yes))
                }
            },
            dismissButton = {
                Button(
                    onClick = {
                        showForceConfirm = false
                    }) {
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
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
) {
    var endpointUrl: String? = null
    var message: String = stringResource(R.string.registration_waiting_input)
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

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val compactLayout = maxWidth < 760.dp

        if (compactLayout) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OperatorInfoCard(
                    title = stringResource(R.string.registration_status_title),
                    modifier = Modifier.fillMaxWidth(),
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
                        text = stringResource(R.string.registration_status_force_hint),
                        color = OperatorPalette.subtitle,
                    )
                }
                RegistrationActionArea(
                    scope = scope,
                    navController = navController,
                    registrationUiState = registrationUiState,
                    onDeregister = onDeregister,
                    allowForceDeregister = allowForceDeregister,
                    onForceDeregister = onForceDeregister,
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(20.dp),
                verticalAlignment = Alignment.Top,
            ) {
                OperatorInfoCard(
                    title = stringResource(R.string.registration_status_title),
                    modifier = Modifier.weight(1f),
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
                        text = stringResource(R.string.registration_status_force_hint),
                        color = OperatorPalette.subtitle,
                    )
                }
                RegistrationActionArea(
                    scope = scope,
                    navController = navController,
                    registrationUiState = registrationUiState,
                    onDeregister = onDeregister,
                    allowForceDeregister = allowForceDeregister,
                    onForceDeregister = onForceDeregister,
                    modifier = Modifier.weight(0.45f),
                )
            }
        }
    }
}

@Composable
private fun RegistrationActionArea(
    scope: CoroutineScope,
    navController: NavController,
    registrationUiState: RegistrationUiState,
    onDeregister: () -> Unit,
    allowForceDeregister: ForceDeregisterState,
    onForceDeregister: () -> Unit,
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
                    onDeregister = { scope.launch { viewModel.deregister() } },
                    allowForceDeregister = allowForceDeregister,
                    onForceDeregister = { scope.launch { viewModel.deregister(force = true) } },
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
