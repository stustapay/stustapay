package de.stustapay.stustapay.ui.root

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.libssp.util.SysUiController
import de.stustapay.stustapay.ui.account.AccountView
import de.stustapay.stustapay.ui.account.AccountViewModel
import de.stustapay.stustapay.ui.cashier.CashierView
import de.stustapay.stustapay.ui.debug.DebugView
import de.stustapay.stustapay.ui.entry.EntryView
import de.stustapay.stustapay.ui.history.SaleHistoryView
import de.stustapay.stustapay.ui.nav.NavChangeHandler
import de.stustapay.stustapay.ui.nav.navigateDestination
import de.stustapay.stustapay.ui.payinout.CashInOutView
import de.stustapay.stustapay.ui.payinout.postpayment.PostPaymentView
import de.stustapay.stustapay.ui.reward.RewardView
import de.stustapay.stustapay.ui.sale.SaleView
import de.stustapay.stustapay.ui.settings.SettingsView
import de.stustapay.stustapay.ui.stats.StatsView
import de.stustapay.stustapay.ui.swap.SwapView
import de.stustapay.stustapay.ui.ticket.TicketView
import de.stustapay.stustapay.ui.user.UserView
import de.stustapay.stustapay.ui.vault.VaultView


@Composable
fun RootView(uictrl: SysUiController? = null) {
    val navController = rememberNavController()

    DisposableEffect(navController, uictrl) {
        if (uictrl == null) {
            onDispose {}
        } else {
            val listener = NavChangeHandler(RootNavDests, uictrl)
            navController.addOnDestinationChangedListener(listener)
            onDispose {
                navController.removeOnDestinationChangedListener(listener)
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = RootNavDests.startpage.route,
    ) {
        composable(RootNavDests.startpage.route) {
            val viewModel: StartpageViewModel = hiltViewModel()
            val terminalConfigViewModel: TerminalConfigViewModel = hiltViewModel()
            val loginState = viewModel.uiState.collectAsStateWithLifecycle()
            val configLoading = viewModel.configLoading.collectAsStateWithLifecycle()
            DynamicSystemUiEffect(
                uictrl = uictrl,
                hidden = loginState.value.isSelfServiceTerminal() &&
                    loginState.value.hasConfig() &&
                    !configLoading.value,
            )

            StartpageView(
                navigateTo = { navTo ->
                if (navTo == RootNavDests.entry) {
                    navController.navigate(navTo.route) {
                        popUpTo(RootNavDests.startpage.route) {
                            inclusive = true
                        }
                        launchSingleTop = true
                    }
                } else {
                    navController.navigateDestination(
                        navTo
                    )
                }
            },
                viewModel = viewModel,
                terminalConfigViewModel = terminalConfigViewModel,
            )
        }
        composable(RootNavDests.entry.route) {
            EntryView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.ticket.route) {
            TicketView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.sale.route) {
            SaleView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.topup.route) {
            CashInOutView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.postpayment.route) {
            PostPaymentView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.status.route) {
            val viewModel: AccountViewModel = hiltViewModel()
            val isSelfService = viewModel.isSelfServiceMode.collectAsStateWithLifecycle()
            val canSelfServiceBalance = viewModel.canSelfServiceBalance.collectAsStateWithLifecycle()
            DynamicSystemUiEffect(
                uictrl = uictrl,
                hidden = isSelfService.value && canSelfServiceBalance.value,
            )

            AccountView(
                leaveView = { navController.navigateUp() },
                viewModel = viewModel,
            )
        }
        composable(RootNavDests.user.route) {
            UserView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.settings.route) {
            SettingsView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.development.route) {
            DebugView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.history.route) {
            SaleHistoryView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.stats.route) {
            StatsView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.rewards.route) {
            RewardView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.swap.route) {
            SwapView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.cashier.route) {
            CashierView(leaveView = { navController.navigateUp() })
        }
        composable(RootNavDests.vault.route) {
            VaultView(leaveView = { navController.navigateUp() })
        }
    }
}

@Composable
private fun DynamicSystemUiEffect(
    uictrl: SysUiController?,
    hidden: Boolean,
) {
    LaunchedEffect(uictrl, hidden) {
        if (hidden) {
            uictrl?.hideSystemUI()
        } else {
            uictrl?.showSystemUI()
        }
    }
}
