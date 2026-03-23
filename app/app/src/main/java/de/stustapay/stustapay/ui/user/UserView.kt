package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.navigateTo


object UserNavDest {
    val info = NavDest("info")
    val create = NavDest("create")
    val update = NavDest("update")
    val display = NavDest("display")
}


/**
 * User management on this terminal.
 */
@Preview
@Composable
fun UserView(
    leaveView: () -> Unit = {}, viewModel: UserViewModel = hiltViewModel()
) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = UserNavDest.info.route,
        modifier = Modifier.fillMaxSize()
    ) {
        composable(UserNavDest.info.route) {
            OperatorScaffold(
                title = stringResource(R.string.user_title),
                subtitle = stringResource(R.string.user_view_info_subtitle),
                icon = Icons.Filled.Person,
                terminalLabel = stringResource(R.string.user_view_terminal_label),
                footerHint = stringResource(R.string.user_view_footer_hint),
                footerSection = stringResource(R.string.user_view_footer_section),
                footerStatus = stringResource(R.string.user_view_footer_root),
                onBack = {
                    viewModel.idleState()
                    leaveView()
                },
            ) {
                UserLoginView(viewModel, goToUserCreateView = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.create.route)
                }, goToUserDisplayView = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.display.route)
                })
            }
        }
        composable(UserNavDest.create.route) {
            OperatorScaffold(
                title = stringResource(R.string.user_create_title),
                subtitle = stringResource(R.string.user_view_create_subtitle),
                icon = Icons.Filled.PersonAdd,
                terminalLabel = stringResource(R.string.user_view_create_terminal),
                footerHint = stringResource(R.string.user_view_create_hint),
                footerSection = stringResource(R.string.user_view_footer_section),
                footerStatus = stringResource(R.string.user_view_create_terminal),
                onBack = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.info.route)
                },
            ) {
                UserCreateView(viewModel = viewModel, goToUserDisplayView = {
                    navController.navigateTo(UserNavDest.display.route)
                })
            }
        }
        composable(UserNavDest.update.route) {
            OperatorScaffold(
                title = stringResource(R.string.user_update_title),
                subtitle = stringResource(R.string.user_view_update_subtitle),
                icon = Icons.Filled.Edit,
                terminalLabel = stringResource(R.string.user_view_update_terminal),
                footerHint = stringResource(R.string.user_view_update_hint),
                footerSection = stringResource(R.string.user_view_footer_section),
                footerStatus = stringResource(R.string.user_view_update_terminal),
                onBack = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.info.route)
                },
            ) {
                UserUpdateView(viewModel)
            }
        }
        composable(UserNavDest.display.route) {
            OperatorScaffold(
                title = stringResource(R.string.user_display_title),
                subtitle = stringResource(R.string.user_view_display_subtitle),
                icon = Icons.Filled.Badge,
                terminalLabel = stringResource(R.string.user_view_display_terminal),
                footerHint = stringResource(R.string.user_view_display_hint),
                footerSection = stringResource(R.string.user_view_footer_section),
                footerStatus = stringResource(R.string.user_view_display_terminal),
                onBack = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.info.route)
                },
            ) {
                UserDisplayView(viewModel = viewModel, goToUserUpdateView = {
                    navController.navigateTo(UserNavDest.update.route)
                })
            }
        }
    }
}
