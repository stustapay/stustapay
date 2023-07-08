package de.stustapay.stustapay.ui.ticket

import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController


import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable


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

    BackHandler {
        leaveView()
    }

    NavHost(
        navController = nav,
        startDestination = TicketPage.Scan.route
    ) {
        composable(TicketPage.Scan.route) {
            // scan all the bought tickets
            TicketScan(
                viewModel = viewModel,
                leaveView = leaveView,
            )
        }
        composable(TicketPage.Confirm.route) {
            // payment type selection
            TicketConfirm(
                viewModel = viewModel,
                goBack = { viewModel.navTo(TicketPage.Scan) },
            )
        }
        composable(TicketPage.Done.route) {
            TicketSuccess(
                viewModel = viewModel,
                onConfirm = { viewModel.dismissSuccess() },
            )
        }
        composable(TicketPage.Error.route) {
            TicketError(
                onDismiss = { viewModel.dismissError() },
                viewModel
            )
        }
    }
}