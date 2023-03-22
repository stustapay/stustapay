package de.stustanet.stustapay.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.QRScanView
import de.stustanet.stustapay.ui.pref.PrefGroup
import de.stustanet.stustapay.ui.settings.RegistrationUiState.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch


@Composable
fun RegistrationOverview(
    scope: CoroutineScope,
    navController: NavController,
    registrationUiState: RegistrationUiState
) {

    PrefGroup(title = { Text("Server Connection") }) {

        var endpointUrl: String? = null
        var message: String? = null
        when (registrationUiState) {
            Loading -> {
                message = "loading..."
            }

            is Error -> {
                message = registrationUiState.message
            }
            is Registered -> {
                endpointUrl = registrationUiState.endpointUrl
                message = registrationUiState.message
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

@Preview
@Composable
fun RegistrationView(viewModel: RegistrationViewModel = hiltViewModel()) {

    // when the registrationUiState flow changes, re-draw this function (collect)
    // we only want the latest value of the flow, i.e. a state (asState)
    // we want to pause subscription when the application is no longer visible (withLifecycle)
    val registrationUiState: RegistrationUiState by viewModel.registrationUiState.collectAsStateWithLifecycle()

    var scope = rememberCoroutineScope()
    var navController = rememberNavController()

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
                registrationUiState = registrationUiState
            )
        }
        composable("scan") {
            QRScanView {qrcode ->
                scope.launch {
                    viewModel.register(qrcode)
                }
                navController.navigate("register")
            }
        }
    }
}
