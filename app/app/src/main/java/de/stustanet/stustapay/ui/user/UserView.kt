package de.stustanet.stustapay.ui.user

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


object UserNavDest {
    val info = NavDest("info")
}


/**
 * User management on this terminal.
 */
@Preview
@Composable
fun UserView(leaveView: () -> Unit = {},
             viewModel : UserViewModel = hiltViewModel()) {

    val navController = rememberNavController()
    val scaffoldState = rememberScaffoldState()

    NavScaffold(
        title = { Text(text = "User Management") },
        state = scaffoldState,
        navigateBack = {
            if (navController.currentDestination?.route == UserNavDest.info.route) {
                leaveView()
            } else {
                navController.popBackStack()
            }
        },
        hasDrawer = false
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = UserNavDest.info.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
        ) {
            composable(UserNavDest.info.route) { UserLoginView(viewModel) }
        }
    }

}