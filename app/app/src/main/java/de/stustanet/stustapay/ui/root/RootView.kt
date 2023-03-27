package de.stustanet.stustapay.ui.root

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.order.OrderView
import de.stustanet.stustapay.ui.QRScanView
import de.stustanet.stustapay.ui.chipstatus.ChipStatusView
import de.stustanet.stustapay.ui.debug.DebugView
import de.stustanet.stustapay.ui.deposit.DepositView
import de.stustanet.stustapay.ui.nav.*
import de.stustanet.stustapay.ui.settings.SettingsView
import de.stustanet.stustapay.util.SysUiController


@Composable
fun RootView(uictrl: SysUiController? = null) {
    val navController = rememberNavController()

    if (uictrl != null) {
        navController.addOnDestinationChangedListener(
            NavChangeHandler(RootNavDests.getRoutePropMap(), uictrl)
        )
    }

    NavHost(navController = navController, startDestination = RootNavDests.main.route) {
        composable(RootNavDests.main.route) {
            NavScaffold(
                title = { Text("StuStaPay") },
                hasDrawer = true,
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            ) { paddingValues ->
                Box(
                    modifier = Modifier
                        .height(64.dp)
                        .fillMaxWidth()
                        .padding(bottom = paddingValues.calculateBottomPadding()),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(text = stringResource(R.string.welcome_to_stustapay))
                }
            }
        }
        composable(RootNavDests.ordering.route) {
            OrderView()
        }
        composable(RootNavDests.deposit.route) {
            DepositView()
        }
        composable(RootNavDests.settings.route) {
            SettingsView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.qrscan.route) { QRScanView() }
        composable(RootNavDests.debug.route) { DebugView(hiltViewModel()) }
        composable(RootNavDests.chipstatus.route) {
            NavScaffold(
                title = { Text("StuStaPay") },
                hasDrawer = true,
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            ) {
                ChipStatusView()
            }
        }
    }
}