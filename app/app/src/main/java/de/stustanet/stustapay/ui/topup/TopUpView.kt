package de.stustanet.stustapay.ui.topup

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

@Preview
@Composable
fun TopUpView(
    leaveView: () -> Unit = {},
    viewModel: DepositViewModel = hiltViewModel()
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
        startDestination = TopUpPage.Amount.route
    ) {
        composable(TopUpPage.Amount.route) {
            TopUpSelection(
                goToCash = { nav.navigateTo(TopUpPage.Cash.route) },
                viewModel
            )
        }
        composable(TopUpPage.Cash.route) {
            TopUpCashConfirm(
                goBack = { nav.navigateTo(TopUpPage.Amount.route) },
                viewModel
            )
        }
        composable(TopUpPage.Done.route) {
            TopUpSuccess(
                onDismiss = { nav.navigateTo(TopUpPage.Amount.route) },
                viewModel
            )
        }
        composable(TopUpPage.Failure.route) {
            TopUpError(
                onDismiss = { nav.navigateTo(TopUpPage.Amount.route) },
                viewModel
            )
        }
    }
}
