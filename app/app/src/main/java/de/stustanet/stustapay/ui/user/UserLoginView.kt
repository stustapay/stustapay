package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanDialog
import kotlinx.coroutines.launch

/** after a scan happened, where do we send the info to */
private enum class ScanTarget {
    Login,
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserLoginView(
    viewModel: UserViewModel
) {

    val scope = rememberCoroutineScope()
    val userUiState: UserUIState by viewModel.userUIState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {

        LaunchedEffect(true) {
            viewModel.fetchLogin()
        }

        var scanTag by remember { mutableStateOf(false) }
        var target by remember { mutableStateOf(ScanTarget.Login) }

        if (scanTag) {
            ChipScanDialog(
                onScan = { uid ->
                    scanTag = false
                    when (target) {
                        ScanTarget.Login -> {
                            scope.launch {
                                viewModel.login(uid)
                            }
                        }
                    }
                },
                onDismissRequest = {
                    scanTag = false
                }
            )
        }

        val user: String
        var subtext: String? = null
        when (val state = userUiState) {
            is UserUIState.NotLoggedIn -> {
                user = "Not logged in"
            }
            is UserUIState.LoggedIn -> {
                user = state.username
                subtext = "Logged in"
            }
            is UserUIState.Error -> {
                user = "Error"
                subtext = state.message
            }
        }


        ListItem(
            text = { Text(user) },
            secondaryText = if (subtext != null) {
                {
                    Text(subtext)
                }
            } else {
                null
            },
            icon = {
                Icon(
                    Icons.Filled.Person,
                    contentDescription = null,
                    modifier = Modifier.size(56.dp)
                )
            }
        )

        Divider()

        Button(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            onClick = {
                scanTag = true
                target = ScanTarget.Login
            },
        ) {
            Text("Login User", fontSize = 24.sp)
        }

        if (userUiState is UserUIState.LoggedIn) {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                onClick = {
                    scope.launch {
                        viewModel.logout()
                    }
                },
                colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red),
            ) {
                Text("Logout", fontSize = 24.sp)
            }
        }

        Divider()

        var newUserUnavailableHint by remember { mutableStateOf(false) }
        if (newUserUnavailableHint) {
            AlertDialog(
                title = {
                    Text(text = "User Registration")
                },
                text = {
                    Text("Not available yet.")
                },
                onDismissRequest = { newUserUnavailableHint = false },
                confirmButton = {
                    Button(
                        onClick = {
                            newUserUnavailableHint = false
                        }
                    ) {
                        Text("Ok :(")
                    }
                },
            )
        }

        Button(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            onClick = {
                newUserUnavailableHint = true
            }
        ) {
            Text("Create new user", fontSize = 24.sp)
        }
    }
}
