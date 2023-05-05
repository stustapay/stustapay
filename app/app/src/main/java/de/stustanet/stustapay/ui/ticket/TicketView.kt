package de.stustanet.stustapay.ui.ticket

import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController


import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.navigateTo



@Composable
fun TicketView(
    leaveView: () -> Unit = {},
    viewModel: TicketViewModel = hiltViewModel()
) {
    val nav = rememberNavController()
    val navTarget by viewModel.navState.collectAsStateWithLifecycle()

    LaunchedEffect(navTarget) {
        if (nav.currentDestination?.route != navTarget.route) {
            nav.navigate(navTarget.route)
        }
    }

    // fetch the terminal configuration
    LaunchedEffect(Unit) {
        viewModel.fetchConfig()
    }

    BackHandler {
        leaveView()
    }

    NavHost(
        navController = nav,
        startDestination = TicketPage.Amount.route
    ) {
        composable(TicketPage.Amount.route) {
            TicketSelection(
                viewModel = viewModel,
                leaveView = leaveView,
            )
        }
        composable(TicketPage.Done.route) {
            TicketSuccess(
                onDismiss = { nav.navigateTo(TicketPage.Amount.route) },
                viewModel
            )
        }
        composable(TicketPage.Failure.route) {
            TicketError(
                onDismiss = { nav.navigateTo(TicketPage.Amount.route) },
                viewModel
            )
        }
    }
}