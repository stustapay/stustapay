package de.stustanet.stustapay.ui

import android.os.Bundle
import androidx.compose.foundation.layout.*
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.SysUiController
import de.stustanet.stustapay.ui.chipstatus.ChipStatusView
import de.stustanet.stustapay.ui.deposit.DepositView
import de.stustanet.stustapay.ui.theme.StuStaPayTheme


enum class TopAppBarIcon {
    MENU,
    BACK,
}


/**
 * To react to navigation changes even when one uses the system back button.
 */
class NavChangeHandler(
    private val destinations: HashMap<String, NavDest>,
    private val uictrl: SysUiController
) : NavController.OnDestinationChangedListener {

    override fun onDestinationChanged(
        controller: NavController,
        destination: NavDestination,
        arguments: Bundle?
    ) {

        val dest = destinations[destination.route]
        if (dest != null) {
            if (dest.showNavbar) {
                uictrl.showSystemUI()
            } else {
                uictrl.hideSystemUI()
            }
        }

    }
}


fun NavHostController.navigateDestination(dest: NavDest) =
    this.navigate(dest.route) {
        launchSingleTop = true
    }


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
                    Text(text = "Welcome to StuStaPay!")
                }
            }
        }
        composable(RootNavDests.ordering.route) {
            NavScaffold(
                title = { Text("StuStaPay") },
                hasDrawer = true,
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            ) {
                OrderView()
            }
        }
        composable(RootNavDests.deposit.route) {
            NavScaffold(
                title = { Text("StuStaPay") },
                hasDrawer = true,
                navigateTo = { navTo ->
                    navController.navigateDestination(
                        navTo
                    )
                }
            ) {
                DepositView()
            }
        }
        composable(RootNavDests.settings.route) {
            SettingsView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.qrscan.route) { QRScanView() }
        composable(RootNavDests.connTest.route) { TestConnectionView() }
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


@Preview(showBackground = true)
@Composable
fun Main(uictrl: SysUiController? = null) {
    StuStaPayTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colors.background
        ) {
            RootView(uictrl)
        }
    }
}