package de.stustanet.stustapay.ui.root

import de.stustanet.stustapay.ui.nav.NavDest

/** root views (opened by navigation drawer) */
object RootNavDests {
    val main = NavDest("main")
    val ordering = NavDest("ordering", showNavbar = false)
    val deposit = NavDest("deposit", showNavbar = false)
    val qrscan = NavDest("qrscan")
    val settings = NavDest("settings")
    val debug = NavDest("debug")

    fun getRoutePropMap(): HashMap<String, NavDest> {
        val routePropMap = HashMap<String, NavDest>()

        // we need the navigation destinations at runtime
        // because the funny NavChangeHandler only gets the destination route
        // and not our nice NavDest object...
        for (it in this::class.java
            .declaredFields
            .filter { it.name != "INSTANCE" }
            .map { it.get(this) }) {

            if (it is NavDest) {
                routePropMap[it.route] = it
            }
        }
        return routePropMap
    }
}
