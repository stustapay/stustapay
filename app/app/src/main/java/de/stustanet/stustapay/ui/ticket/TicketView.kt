package de.stustanet.stustapay.ui.ticket

import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController


import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch


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
            // pick ticket amounts, scan tickets
            TicketSelection(
                viewModel = viewModel,
                leaveView = leaveView,
            )
        }
        composable(TicketPage.Scan.route) {
            // scan all the bought tickets
            TicketScanning(
                viewModel = viewModel,
                goBack = { viewModel.navTo(TicketPage.Amount) },
            )
        }
        composable(TicketPage.Confirm.route) {
            // payment type selection
            TicketConfirm(
                viewModel = viewModel,
                goBack = { viewModel.navTo(TicketPage.Amount) },
            )
        }
        composable(TicketPage.Done.route) {
            TicketSuccess(
                viewModel = viewModel,
                onConfirm = { viewModel.dismissSuccess() },
            )
        }
        composable(TicketPage.Failure.route) {
            TicketError(
                onDismiss = { viewModel.dismissError() },
                viewModel
            )
        }
    }
}