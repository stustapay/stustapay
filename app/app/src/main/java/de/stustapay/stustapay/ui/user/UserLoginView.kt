package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.UserRolesState
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.libssp.ui.theme.errorButtonColors
import de.stustapay.stustapay.ui.common.tagIDtoString
import kotlinx.coroutines.launch

/** after a scan happened, where do we send the info to */
private enum class ScanTarget {
    Login,
}


/**
 * how the user can select the login state.
 */
sealed interface RoleSelectionState {
    object Closed : RoleSelectionState
    data class Select(var tag: NfcTag) : RoleSelectionState
}


@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserLoginView(
    viewModel: UserViewModel,
    goToUserCreateView: () -> Unit,
    goToUserDisplayView: () -> Unit,
) {

    val scope = rememberCoroutineScope()

    val userUIState: UserUIState by viewModel.userUIState.collectAsStateWithLifecycle()
    val userUIStateV = userUIState

    val status by viewModel.userStatus.collectAsStateWithLifecycle()
    val currentTag by viewModel.currentTag.collectAsStateWithLifecycle()
    val currentTagV = currentTag

    val userRoles by viewModel.userRoles.collectAsStateWithLifecycle()
    val userRolesV = userRoles

    val scanState = rememberNfcScanDialogState()

    LaunchedEffect(Unit) {
        scope.launch {
            viewModel.fetchLogin()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {

        var scanTarget by remember { mutableStateOf(ScanTarget.Login) }

        var roleSelection by remember { mutableStateOf<RoleSelectionState>(RoleSelectionState.Closed) }
        val roleSelectionV = roleSelection

        NfcScanDialog(
            state = scanState,
            onScan = { tag ->
                when (scanTarget) {
                    ScanTarget.Login -> {
                        scope.launch {
                            roleSelection = RoleSelectionState.Select(tag)
                            viewModel.checkLogin(tag)
                        }
                    }
                }
            },
        ) {
            when (scanTarget) {
                ScanTarget.Login -> {
                    Text(
                        stringResource(R.string.nfc_scan_login),
                        textAlign = TextAlign.Center,
                        fontSize = 40.sp
                    )
                }
            }
        }

        when (userRolesV) {
            is UserRolesState.OK -> {
                if (roleSelectionV is RoleSelectionState.Select) {
                    if (userRolesV.roles.size == 1) {
                        // bypass dialog for single available role
                        LaunchedEffect(Unit) {
                            scope.launch {
                                roleSelection = RoleSelectionState.Closed
                                viewModel.login(roleSelectionV.tag, userRolesV.roles[0].id)
                            }
                        }
                    } else {
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
            }

            is UserRolesState.Unknown -> {}
            is UserRolesState.Error -> {
                ListItem(
                    text = { Text(userRolesV.msg) },
                    icon = {
                        Icon(
                            painter = painterResource(de.stustapay.libssp.R.drawable.warning_24),
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
                user = stringResource(R.string.user_error_no_login)
            }

            is UserUIState.LoggedIn -> {
                user = userUIStateV.username
                subtext = userUIStateV.activeRole
            }

            is UserUIState.Error -> {
                user = stringResource(R.string.common_error)
                subtext = userUIStateV.message
            }
        }

        ListItem(
            text = { Text(user) },
            secondaryText = { Text(subtext ?: "") },
            icon = {
                Icon(
                    painter = painterResource(de.stustapay.libssp.R.drawable.person_24),
                    contentDescription = null,
                    modifier = Modifier.size(42.dp)
                )
            }
        )

        Divider()

        if (userUIStateV !is UserUIState.LoggedIn || userUIStateV.showLoginUser) {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                onClick = {
                    viewModel.clearErrors()
                    scanTarget = ScanTarget.Login
                    scanState.open()
                },
            ) {
                Text(if (userUIStateV !is UserUIState.LoggedIn) {
                    stringResource(R.string.user_login)
                } else {
                    stringResource(R.string.user_login_other)
                }, fontSize = 24.sp, textAlign = TextAlign.Center)
            }
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
                colors = errorButtonColors(),
            ) {
                Text(
                    stringResource(R.string.user_logout),
                    fontSize = 24.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
        else if (currentTagV != null) {
            Row(modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 10.dp)) {
                Text(
                    "Tag UID: ",
                    fontSize = 24.sp,
                    textAlign = TextAlign.Center,
                )
                SelectionContainer {
                    Text(
                        tagIDtoString(currentTagV.uid.ulongValue(true)),
                        fontSize = 24.sp,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        Divider()

        Spacer(modifier = Modifier.height(15.dp))

        val statusV = status
        if (statusV != null) {
            ListItem(
                text = { Text(statusV) },
                icon = {
                    Icon(
                        painter = painterResource(de.stustapay.libssp.R.drawable.info_24),
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
                Text(
                    stringResource(R.string.user_create_title),
                    fontSize = 24.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        if (userUIStateV is UserUIState.LoggedIn && userUIStateV.showCreateUser) {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                onClick = { goToUserDisplayView() }
            ) {
                Text(
                    stringResource(R.string.user_display_title),
                    fontSize = 24.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
