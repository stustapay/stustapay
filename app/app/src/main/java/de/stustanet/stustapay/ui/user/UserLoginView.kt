package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.UserRole
import de.stustanet.stustapay.model.UserRolesState
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

/** after a scan happened, where do we send the info to */
private enum class ScanTarget {
    Login,
}


/**
 * how the user can select the login state.
 */
sealed interface RoleSelectionState {
    object Closed: RoleSelectionState
    data class Select(var tag: UserTag): RoleSelectionState
}


@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserLoginView(
    viewModel: UserViewModel,
    goToUserCreateView: () -> Unit
) {

    val scope = rememberCoroutineScope()

    val userUIState: UserUIState by viewModel.userUIState.collectAsStateWithLifecycle()
    val userUIStateV = userUIState

    val userUIMessage by viewModel.userUIMessage.collectAsStateWithLifecycle()

    val userRoles by viewModel.userRoles.collectAsStateWithLifecycle()
    val userRolesV = userRoles

    val scanState = rememberNfcScanDialogState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {

        LaunchedEffect(true) {
            viewModel.fetchLogin()
        }

        var target by remember { mutableStateOf(ScanTarget.Login) }

        var roleSelection by remember { mutableStateOf<RoleSelectionState>(RoleSelectionState.Closed) }
        val roleSelectionV = roleSelection

        NfcScanDialog(
            scanState,
            onScan = { tag ->
                when (target) {
                    ScanTarget.Login -> {
                        scope.launch {
                            roleSelection = RoleSelectionState.Select(tag)
                            viewModel.checkLogin(tag)
                        }
                    }
                }
            },
        )

        when (userRolesV) {
            is UserRolesState.OK -> {
                if (roleSelectionV is RoleSelectionState.Select) {
                    if (userRolesV.roles.size == 1) {
                        // bypass dialog for single available role
                        LaunchedEffect(Unit) {
                            viewModel.login(roleSelectionV.tag, userRolesV.roles[0].id)
                        }
                    }
                    RoleSelectionDialog(
                        roles = userRolesV,
                        onDismiss = {
                            roleSelection = RoleSelectionState.Closed
                        },
                        onSelect = { roleID ->
                            scope.launch {
                                val tag = roleSelectionV.tag
                                roleSelection = RoleSelectionState.Closed
                                viewModel.login(tag, roleID)
                            }
                        }
                    )
                }
            }
            is UserRolesState.Unknown -> {}
            is UserRolesState.Error -> {
                ListItem(
                    text = { Text(userRolesV.msg) },
                    icon = {
                        Icon(
                            Icons.Filled.Warning,
                            contentDescription = null,
                            modifier = Modifier.size(56.dp)
                        )
                    }
                )
            }
        }

        val user: String
        var subtext: String? = null
        when (userUIStateV) {
            is UserUIState.NotLoggedIn -> {
                user = "Not logged in"
            }
            is UserUIState.LoggedIn -> {
                user = userUIStateV.username
                subtext = userUIStateV.activeRole
            }
            is UserUIState.Error -> {
                user = "Error"
                subtext = userUIStateV.message
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

        if (userUIStateV is UserUIState.LoggedIn) {
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


        if (userUIStateV is UserUIState.LoggedIn && userUIStateV.showCreateUser) {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                onClick = { goToUserCreateView() }
            ) {
                Text("Create new user", fontSize = 24.sp)
            }
        }
    }
}
