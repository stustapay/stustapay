package de.stustapay.stustapay.ui.payinout.topup

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.ui.nav.navigateTo


@Composable
fun TopUpView(
    viewModel: TopUpViewModel = hiltViewModel()
) {
    val navTarget by viewModel.navState.collectAsStateWithLifecycle()

    when (navTarget) {
        TopUpPage.Selection -> {
            TopUpSelection(
                viewModel = viewModel,
            )
        }
        TopUpPage.Done -> {
            TopUpSuccess(
                onDismiss = { viewModel.navigateTo(TopUpPage.Selection) },
                viewModel = viewModel,
            )
        }
        TopUpPage.Failure -> {
            TopUpError(
                onDismiss = { viewModel.navigateTo(TopUpPage.Selection) },
                viewModel = viewModel,
            )
        }
    }
}
