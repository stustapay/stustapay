package de.stustapay.stustapay.ui.user

import android.util.Log
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.NavScaffold
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
    val scaffoldState = rememberScaffoldState()

    NavHost(
        navController = navController,
        startDestination = UserNavDest.info.route,
        modifier = Modifier.fillMaxSize()
    ) {
        composable(UserNavDest.info.route) {
            NavScaffold(title = { Text(stringResource(R.string.user_title)) },
                state = scaffoldState,
                navigateBack = {
                    if (navController.currentDestination?.route == UserNavDest.info.route) {
                        viewModel.idleState()
                        leaveView()
                    } else {
                        navController.popBackStack()
                    }
                }) {
                Box(modifier = Modifier.padding(it)) {
                    UserLoginView(viewModel, goToUserCreateView = {
                        viewModel.idleState()
                        navController.navigateTo(UserNavDest.create.route)
                    }, goToUserDisplayView = {
                        viewModel.idleState()
                        navController.navigateTo(UserNavDest.display.route)
                    })
                }
            }
        }
        composable(UserNavDest.create.route) {
            NavScaffold(title = { Text(stringResource(R.string.user_create_title)) },
                navigateBack = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.info.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    UserCreateView(viewModel = viewModel, goToUserDisplayView = {
                        navController.navigateTo(UserNavDest.display.route)
                    })
                }
            }
        }
        composable(UserNavDest.update.route) {
            NavScaffold(title = { Text(stringResource(R.string.user_update_title)) },
                navigateBack = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.info.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    UserUpdateView(viewModel)
                }
            }
        }
        composable(UserNavDest.display.route) {
            NavScaffold(title = { Text(stringResource(R.string.user_display_title)) },
                navigateBack = {
                    viewModel.idleState()
                    navController.navigateTo(UserNavDest.info.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    UserDisplayView(viewModel = viewModel, goToUserUpdateView = {
                        navController.navigateTo(UserNavDest.update.route)
                    })
                }
            }
        }
    }
}