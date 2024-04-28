package de.stustapay.stustapay.ui.account

import androidx.activity.compose.BackHandler
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.NavDestinations
import de.stustapay.stustapay.ui.nav.NavScaffold
import de.stustapay.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch


object CustomerStatusNavDests : NavDestinations() {
    val scan = NavDest("scan")
    val status = NavDest("status")
    val swap = NavDest("swap")
}


@Preview
@Composable
fun AccountView(
    leaveView: () -> Unit = {},
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()

    BackHandler {
        leaveView()
    }

    NavScaffold(
        title = { Text(stringResource(R.string.customer_title)) },
        navigateBack = leaveView
    ) {
        NavHost(navController = nav, startDestination = CustomerStatusNavDests.scan.route) {
            composable(CustomerStatusNavDests.scan.route) {
                AccountScan(onScan = {
                    scope.launch {
                        viewModel.setNewTag(it)
                        nav.navigateTo(CustomerStatusNavDests.status.route)
                    }
                })
            }

            composable(CustomerStatusNavDests.status.route) {
                AccountStatus(
                    viewModel = viewModel,
                    navigateTo = { dest -> nav.navigateTo(dest.route) }
                )
            }

            composable(CustomerStatusNavDests.swap.route) {
                AccountSwap(
                    goBack = { nav.navigateTo(CustomerStatusNavDests.status.route) },
                    viewModel = viewModel,
                )
            }
        }
    }
}