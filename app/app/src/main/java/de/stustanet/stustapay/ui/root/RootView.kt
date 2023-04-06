package de.stustanet.stustapay.ui.root

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.debug.DebugView
import de.stustanet.stustapay.ui.deposit.DepositView
import de.stustanet.stustapay.ui.nav.NavChangeHandler
import de.stustanet.stustapay.ui.nav.navigateDestination
import de.stustanet.stustapay.ui.order.OrderView
import de.stustanet.stustapay.ui.settings.SettingsView
import de.stustanet.stustapay.ui.user.UserView
import de.stustanet.stustapay.util.SysUiController


@Composable
fun RootView(uictrl: SysUiController? = null) {
    val navController = rememberNavController()

    if (uictrl != null) {
        navController.addOnDestinationChangedListener(
            NavChangeHandler(RootNavDests, uictrl)
        )
    }

    NavHost(
        navController = navController,
        startDestination = RootNavDests.startpage.route,
    ) {
        composable(RootNavDests.startpage.route) {
            StartpageView(
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            )
        }
        composable(RootNavDests.ordering.route) {
            OrderView()
        }
        composable(RootNavDests.deposit.route) {
            DepositView()
        }
        composable(RootNavDests.user.route) {
            UserView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.settings.route) {
            SettingsView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.development.route) {
            DebugView(leaveView = { navController.navigateUp() })
        }
    }
}