package de.stustapay.stustapay.ui.root

import androidx.activity.compose.LocalActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.libssp.util.SysUiController
import de.stustapay.stustapay.MainActivity
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
    val activity = LocalActivity.current
    val startDestination = remember(activity?.intent) {
        benchmarkStartDestination(activity)
    }

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
        startDestination = startDestination,
    ) {
        composable(RootNavDests.startpage.route) {
            val viewModel: StartpageViewModel = hiltViewModel()
            val terminalConfigViewModel: TerminalConfigViewModel = hiltViewModel()
            val loginState by viewModel.uiState.collectAsStateWithLifecycle()
            val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
            val terminalStatusMessage by viewModel.terminalStatusMessage.collectAsStateWithLifecycle()
            DynamicSystemUiEffect(
                uictrl = uictrl,
                hidden = loginState.isSelfServiceTerminal() &&
                    loginState.hasConfig() &&
                    !configLoading,
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
                loginState = loginState,
                configLoading = configLoading,
                terminalStatusMessage = terminalStatusMessage,
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
            SettingsView(
                leaveView = { navController.navigateUp() },
                onOpenUserManagement = { navController.navigateDestination(RootNavDests.user) },
            )
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

private fun benchmarkStartDestination(activity: android.app.Activity?): String {
    val requestedRoute = activity?.intent?.getStringExtra(MainActivity.EXTRA_BENCHMARK_START_ROUTE)
    return if (requestedRoute in benchmarkStartRoutes) {
        requestedRoute ?: RootNavDests.startpage.route
    } else {
        RootNavDests.startpage.route
    }
}

private val benchmarkStartRoutes = setOf(
    RootNavDests.startpage.route,
    RootNavDests.sale.route,
    RootNavDests.topup.route,
    RootNavDests.history.route,
)
