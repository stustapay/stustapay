package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.NavDest
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.nav.navigateTo


object UserNavDest {
    val info = NavDest("info")
    val create = NavDest("create")
    val update = NavDest("update")
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
            NavScaffold(
                title = { Text(text = "User Management") },
                state = scaffoldState,
                navigateBack = {
                    if (navController.currentDestination?.route == UserNavDest.info.route) {
                        leaveView()
                    } else {
                        navController.popBackStack()
                    }
                }
            ) {
                Box(modifier = Modifier.padding(it)) {
                    UserLoginView(
                        viewModel,
                        goToUserCreateView = {
                            navController.navigateTo(UserNavDest.create.route)
                        },
                        goToUserUpdateView = {
                            navController.navigateTo(UserNavDest.update.route)
                        }
                    )
                }
            }
        }
        composable(UserNavDest.create.route) {
            NavScaffold(
                title = { Text("Create User") },
                navigateBack = {
                    viewModel.resetStatus()
                    navController.navigateTo(UserNavDest.info.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    UserCreateView(viewModel)
                }
            }
        }
        composable(UserNavDest.update.route) {
            NavScaffold(
                title = { Text("Update User") },
                navigateBack = {
                    viewModel.resetStatus()
                    navController.navigateTo(UserNavDest.info.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    UserUpdateView(viewModel)
                }
            }
        }
    }
}