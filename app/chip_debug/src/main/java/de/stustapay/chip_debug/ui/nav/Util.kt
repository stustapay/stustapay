package de.stustapay.chip_debug.ui.nav

import androidx.navigation.NavHostController

/**
 * new function for navhosts: how to navigate to a navigation destination
 */
fun NavHostController.navigateDestination(dest: NavDest) =
    this.navigate(dest.route) {
        launchSingleTop = true
    }

/**
 * new helper function for navhosts: navigate to a destination without storing history
 */
fun NavHostController.navigateTo(dest: String) =
    this.navigate(dest) {
        launchSingleTop = true
    }

