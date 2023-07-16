package de.stustapay.stustapay.ui.nav

import androidx.navigation.NavHostController

open class NavDestinations {

    /**
     * lookup from route to navigation destination.
     */
    val routes: HashMap<String, NavDest> by lazy { this.getRoutePropMap() }

    /**
     * walk over all the class members to build the available navigation destination map.
     */
    private fun getRoutePropMap(): HashMap<String, NavDest> {
        val routePropMap = HashMap<String, NavDest>()

        // we need the navigation destinations at runtime
        // because the funny NavChangeHandler only gets the destination route
        // and not our nice NavDest object...
        for (it in this::class.java
            .declaredFields
            .filter { it.name != "INSTANCE" }
            .map {
                it.isAccessible = true
                it.get(this)
            }) {

            if (it is NavDest) {
                routePropMap[it.route] = it
            }
        }
        return routePropMap
    }

    /**
     * get the title for the current location of a nav controller
     */
    fun title(nav: NavHostController): String? {
        return routes[nav.currentDestination?.route]?.title
    }
}