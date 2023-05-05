package de.stustanet.stustapay.ui.root

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.debug.DebugView
import de.stustanet.stustapay.ui.history.SaleHistoryView
import de.stustanet.stustapay.ui.nav.NavChangeHandler
import de.stustanet.stustapay.ui.nav.navigateDestination
import de.stustanet.stustapay.ui.sale.SaleView
import de.stustanet.stustapay.ui.settings.SettingsView
import de.stustanet.stustapay.ui.status.CustomerStatusView
import de.stustanet.stustapay.ui.ticket.TicketView
import de.stustanet.stustapay.ui.topup.TopUpView
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
        composable(RootNavDests.ticket.route) {
            TicketView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.sale.route) {
            SaleView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.topup.route) {
            TopUpView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.status.route) {
            CustomerStatusView()
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
        composable(RootNavDests.history.route) {
            SaleHistoryView()
        }
    }
}
