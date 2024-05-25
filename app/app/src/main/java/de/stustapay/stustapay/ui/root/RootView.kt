package de.stustapay.stustapay.ui.root

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.libssp.util.SysUiController
import de.stustapay.stustapay.ui.account.AccountView
import de.stustapay.stustapay.ui.cashier.CashierView
import de.stustapay.stustapay.ui.debug.DebugView
import de.stustapay.stustapay.ui.history.SaleHistoryView
import de.stustapay.stustapay.ui.nav.NavChangeHandler
import de.stustapay.stustapay.ui.nav.navigateDestination
import de.stustapay.stustapay.ui.payinout.CashInOutView
import de.stustapay.stustapay.ui.reward.RewardView
import de.stustapay.stustapay.ui.sale.SaleView
import de.stustapay.stustapay.ui.settings.SettingsView
import de.stustapay.stustapay.ui.stats.StatsView
import de.stustapay.stustapay.ui.swap.SwapView
import de.stustapay.stustapay.ui.ticket.TicketView
import de.stustapay.stustapay.ui.user.UserView
import de.stustapay.stustapay.ui.vault.VaultView


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
            StartpageView(navigateTo = { navTo ->
                navController.navigateDestination(
                    navTo
                )
            })
        }
        composable(RootNavDests.ticket.route) {
            TicketView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.sale.route) {
            SaleView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.topup.route) {
            CashInOutView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.status.route) {
            AccountView(leaveView = { navController.navigateUp() })
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
            SaleHistoryView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.stats.route) {
            StatsView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.rewards.route) {
            RewardView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.swap.route) {
            SwapView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.cashier.route) {
            CashierView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.vault.route) {
            VaultView(leaveView = { navController.navigateUp() })
        }
    }
}
