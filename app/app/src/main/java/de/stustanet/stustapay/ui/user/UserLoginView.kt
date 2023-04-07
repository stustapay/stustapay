package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberChipScanState
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

    val userUIStateSync: UserUIState by viewModel.userUIState.collectAsStateWithLifecycle()
    val userUIState = userUIStateSync

    val userUIMessage by viewModel.userUIMessage.collectAsStateWithLifecycle()

    val scanState = rememberChipScanState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {

        LaunchedEffect(true) {
            viewModel.fetchLogin()
        }

        var target by remember { mutableStateOf(ScanTarget.Login) }

        ChipScanDialog(
            scanState,
            onScan = { uid ->
                when (target) {
                    ScanTarget.Login -> {
                        scope.launch {
                            viewModel.login(uid)
                        }
                    }
                }
            },
        )

        val user: String
        var subtext: String? = null
        when (userUIState) {
            is UserUIState.NotLoggedIn -> {
                user = "Not logged in"
            }
            is UserUIState.LoggedIn -> {
                user = userUIState.username
                subtext = userUIState.privileges
            }
            is UserUIState.Error -> {
                user = "Error"
                subtext = userUIState.message
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
                scanState.open()
                target = ScanTarget.Login
            },
        ) {
            Text("Login User", fontSize = 24.sp)
        }

        if (userUIState is UserUIState.LoggedIn) {
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

        Spacer(modifier = Modifier.height(15.dp))

        val status = userUIMessage
        if (status != null) {
            ListItem(
                text = { Text(status) },
                icon = {
                    Icon(
                        Icons.Filled.Info,
                        contentDescription = null,
                        modifier = Modifier.size(56.dp)
                    )
                }
            )
        }

        Spacer(modifier = Modifier.height(15.dp))


        if (userUIState is UserUIState.LoggedIn && userUIState.showCreateUser) {
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
}
