package de.stustanet.stustapay.ui.deposit

import androidx.compose.runtime.*
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Preview
@Composable
fun DepositView(viewModel: DepositViewModel = hiltViewModel()) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = "main") {
        composable("main") {
            DepositMain(nav, viewModel)
        }
        composable("method") {
            DepositMethod(nav, viewModel)
        }
        composable("cash") {
            DepositCash(nav, viewModel)
        }
        composable("card") {
            DepositCard(nav, viewModel)
        }
        composable("success") {
            DepositSuccess(nav, viewModel)
        }
        composable("failure") {
            DepositFailure(nav, viewModel)
        }
    }
}
