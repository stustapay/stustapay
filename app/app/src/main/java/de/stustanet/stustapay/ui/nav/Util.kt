package de.stustanet.stustapay.ui.nav

import android.os.Bundle
import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavHostController
import de.stustanet.stustapay.util.SysUiController

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

/**
 * new function for navhosts: how to navigate to a navigation destination
 */
fun NavHostController.navigateDestination(dest: NavDest) =
    this.navigate(dest.route) {
        launchSingleTop = true
    }