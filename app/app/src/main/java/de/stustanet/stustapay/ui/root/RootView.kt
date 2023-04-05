package de.stustanet.stustapay.ui.root

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.QRScanView
import de.stustanet.stustapay.ui.debug.DebugView
import de.stustanet.stustapay.ui.deposit.DepositView
import de.stustanet.stustapay.ui.nav.NavChangeHandler
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.nav.navigateDestination
import de.stustanet.stustapay.ui.order.OrderView
import de.stustanet.stustapay.ui.settings.SettingsView
import de.stustanet.stustapay.ui.startpage.StartpageView
import de.stustanet.stustapay.ui.user.UserView
import de.stustanet.stustapay.util.SysUiController


@Composable
fun RootView(uictrl: SysUiController? = null) {
    val navController = rememberNavController()

    if (uictrl != null) {
        navController.addOnDestinationChangedListener(
            NavChangeHandler(RootNavDests.getRoutePropMap(), uictrl)
        )
    }

    NavHost(navController = navController, startDestination = RootNavDests.startpage.route) {
        composable(RootNavDests.startpage.route) {
            NavScaffold(
                title = {
                    Text("StuStaPay")
                },
                hasDrawer = true,
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            ) {
                StartpageView()
            }
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
        composable(RootNavDests.debug.route) {
            NavScaffold(
                title = { Text("StuStaPay") },
                hasDrawer = true,
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            ) {
                DebugView()
            }
        }
    }
}