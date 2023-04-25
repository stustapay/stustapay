package de.stustanet.stustapay.ui.deposit

import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.navigateTo

@Preview
@Composable
fun DepositView(viewModel: DepositViewModel = hiltViewModel()) {
    val nav = rememberNavController()
    val depositState by viewModel.depositState.collectAsStateWithLifecycle()
    val navTarget by viewModel._navState.collectAsStateWithLifecycle()

    LaunchedEffect(navTarget) {
        if (nav.currentDestination?.route != navTarget.route) {
            nav.navigate(navTarget.route)
        }
    }

    NavHost(navController = nav, startDestination = DepositPage.Amount.route) {
        composable(DepositPage.Amount.route) {
            DepositAmount(
                goToCash = { nav.navigateTo(DepositPage.Cash.route) },
                viewModel
            )
        }
        composable(DepositPage.Cash.route) {
            DepositCash(
                goBack = { nav.navigateTo(DepositPage.Amount.route) },
                viewModel
            )
        }
        composable(DepositPage.Done.route) {
            DepositDone(
                onDismiss = { nav.navigateTo(DepositPage.Amount.route) },
                viewModel
            )
        }
        composable(DepositPage.Failure.route) {
            DepositFailure(
                onDismiss = { nav.navigateTo(DepositPage.Amount.route) },
                viewModel
            ) {
                Text(text = depositState.status, fontSize = 30.sp)
            }
        }
    }
}
