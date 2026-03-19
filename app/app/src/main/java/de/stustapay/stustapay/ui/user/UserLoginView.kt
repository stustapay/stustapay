package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.UserRolesState
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import de.stustapay.libssp.ui.theme.errorButtonColors
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
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
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
                OperatorInfoCard(
                    title = "Role lookup failed",
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(
                            Icons.Filled.Warning,
                            contentDescription = null,
                            modifier = Modifier.size(28.dp),
                            tint = OperatorPalette.danger,
                        )
                        Text(userRolesV.msg, color = OperatorPalette.subtitle)
                    }
                }
            }
        }

        val user: String
        var subtext: String? = null
        when (userUIStateV) {
            is UserUIState.NotLoggedIn -> {
                user = stringResource(R.string.not_logged_in)
            }

            is UserUIState.LoggedIn -> {
                user = userUIStateV.username
                subtext = userUIStateV.activeRole
            }

            is UserUIState.Error -> {
                user = stringResource(R.string.error)
                subtext = userUIStateV.message
            }
        }

        OperatorInfoCard(
            title = "Current session",
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(
                    Icons.Filled.Person,
                    contentDescription = null,
                    modifier = Modifier.size(28.dp),
                    tint = OperatorPalette.accent,
                )
                Column {
                    Text(text = user, color = OperatorPalette.title)
                    if (!subtext.isNullOrBlank()) {
                        Text(text = subtext, color = OperatorPalette.subtitle)
                    }
                }
            }
        }

        if (userUIStateV !is UserUIState.LoggedIn || userUIStateV.showLoginUser) {
            OperatorPrimaryButton(
                modifier = Modifier.fillMaxWidth(),
                text = if (userUIStateV !is UserUIState.LoggedIn) {
                    stringResource(R.string.user_login)
                } else {
                    stringResource(R.string.user_login_other)
                },
                icon = Icons.Filled.QrCode2,
                onClick = {
                    viewModel.clearErrors()
                    scanTarget = ScanTarget.Login
                    scanState.open()
                },
            )
        }

        if (userUIStateV is UserUIState.LoggedIn) {
            OperatorSecondaryButton(
                modifier = Modifier.fillMaxWidth(),
                text = stringResource(R.string.user_logout),
                icon = Icons.Filled.Logout,
                onClick = {
                    scope.launch {
                        viewModel.logout()
                    }
                },
            )
        }

        val statusV = status
        if (statusV != null) {
            OperatorInfoCard(
                title = "Status",
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(
                        Icons.Filled.Info,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp),
                        tint = OperatorPalette.accent,
                    )
                    Text(statusV, color = OperatorPalette.subtitle)
                }
            }
        }

        if (userUIStateV is UserUIState.LoggedIn && userUIStateV.showCreateUser) {
            OperatorPrimaryButton(
                modifier = Modifier.fillMaxWidth(),
                text = stringResource(R.string.user_create_title),
                icon = Icons.Filled.PersonAdd,
                onClick = { goToUserCreateView() }
            )
        }

        if (userUIStateV is UserUIState.LoggedIn && userUIStateV.showCreateUser) {
            OperatorSecondaryButton(
                modifier = Modifier.fillMaxWidth(),
                text = stringResource(R.string.user_display_title),
                icon = Icons.Filled.Person,
                onClick = { goToUserDisplayView() }
            )
        }
    }
}
