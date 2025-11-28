package de.stustapay.stustapay.ui.account

import androidx.activity.compose.BackHandler
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.NavDestinations
import de.stustapay.stustapay.ui.nav.NavScaffold
import de.stustapay.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay


object CustomerStatusNavDests : NavDestinations() {
    val scan = NavDest("scan")
    val status = NavDest("status")
    val details = NavDest("details")
}


@Preview
@Composable
fun AccountView(
    leaveView: () -> Unit = {},
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()
    val uiState = viewModel.uiState.collectAsStateWithLifecycle()
    val isSelfService = viewModel.isSelfServiceMode.collectAsStateWithLifecycle()

    BackHandler {
        leaveView()
    }

    LaunchedEffect(uiState.value.customer, isSelfService.value) {
        if (isSelfService.value) {
            when (uiState.value.customer) {
                is CustomerStatusRequestState.Done,
                is CustomerStatusRequestState.DoneDetails -> {
                    delay(8000)
                    leaveView()
                }
                else -> Unit
            }
        }
    }

    NavScaffold(
        title = { Text(stringResource(R.string.customer_title)) }, navigateBack = leaveView
    ) {
        NavHost(navController = nav, startDestination = CustomerStatusNavDests.scan.route) {
            composable(CustomerStatusNavDests.scan.route) {
                AccountScan(onScan = {
                    scope.launch {
                        viewModel.fetchAccount(it)
                        nav.navigateTo(CustomerStatusNavDests.status.route)
                    }
                })
            }

            composable(CustomerStatusNavDests.status.route) {
                AccountStatus(
                    viewModel = viewModel,
                    navigateTo = { dest -> nav.navigateTo(dest.route) },
                    isSelfService = isSelfService.value,
                    onFinished = leaveView
                )
            }

            composable(CustomerStatusNavDests.details.route) {
                AccountDetails(
                    viewModel = viewModel,
                    navigateTo = { dest -> nav.navigateTo(dest.route) },
                    isSelfService = isSelfService.value,
                    onFinished = leaveView
                )
            }
        }
    }
}
