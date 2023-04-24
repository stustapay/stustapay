package de.stustanet.stustapay.ui.root

import de.stustanet.stustapay.ui.nav.NavDest
import de.stustanet.stustapay.ui.nav.NavDestinations


/** root views (opened by navigation drawer) */
object RootNavDests : NavDestinations() {
    val startpage = NavDest("startpage")
    val ordering = NavDest("ordering", showSystemUI = false)
    val deposit = NavDest("deposit", showSystemUI = false)
    val status = NavDest("status")
    val user = NavDest("user")
    val settings = NavDest("settings")
    val development = NavDest("development")
}
