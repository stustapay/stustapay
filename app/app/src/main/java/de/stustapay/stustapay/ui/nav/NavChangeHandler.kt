package de.stustapay.stustapay.ui.nav

import android.os.Bundle
import androidx.navigation.NavController
import androidx.navigation.NavDestination
import de.stustapay.stustapay.util.SysUiController

/**
 * To react to navigation changes even when one uses the system back button.
 * It can hide the System UI.
 */
class NavChangeHandler(
    private val destinations: NavDestinations,
    private val uictrl: SysUiController
) : NavController.OnDestinationChangedListener {

    override fun onDestinationChanged(
        controller: NavController,
        destination: NavDestination,
        arguments: Bundle?
    ) {
        val dest = destinations.routes[destination.route]
        if (dest != null) {
            if (dest.showSystemUI) {
                uictrl.showSystemUI()
            } else {
                uictrl.hideSystemUI()
            }
        }
    }
}
