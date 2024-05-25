package de.stustapay.stustapay.ui.root

import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.NavDestinations


/** root views (opened by navigation drawer) */
object RootNavDests : NavDestinations() {
    val startpage = NavDest("startpage")
    val ticket = NavDest("ticket", showSystemUI = false)
    val sale = NavDest("sale", showSystemUI = false)
    val topup = NavDest("topup", showSystemUI = false)
    val status = NavDest("status")
    val user = NavDest("user")
    val settings = NavDest("settings")
    val development = NavDest("development")
    val history = NavDest("history")
    val stats = NavDest("stats")
    val rewards = NavDest("rewards")
    val cashier = NavDest("cashier")
    val vault = NavDest("vault")
    val swap = NavDest("swap")
}
