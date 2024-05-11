package de.stustapay.chip_debug.ui.root

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.chip_debug.ui.nav.NavChangeHandler
import de.stustapay.chip_debug.ui.nav.navigateDestination
import de.stustapay.chip_debug.ui.test.NfcDebugView
import de.stustapay.libssp.util.SysUiController


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
        composable(RootNavDests.test.route) {
            NfcDebugView()
        }
    }
}
