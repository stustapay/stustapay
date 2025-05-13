package de.stustapay.stustapay.ui.payinout

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.ui.nav.navigateTo

import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Column
import androidx.compose.material.Scaffold
import androidx.compose.material.Tab
import androidx.compose.material.TabRow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.sp
import de.stustapay.stustapay.ui.payinout.payout.PayOutView
import de.stustapay.stustapay.ui.payinout.topup.TopUpView
import de.stustapay.stustapay.ui.common.ErrorScreen
import de.stustapay.stustapay.ui.nav.TopAppBar
import de.stustapay.stustapay.ui.nav.TopAppBarIcon
import de.stustapay.stustapay.ui.root.RootNavDests
import kotlinx.coroutines.delay


@Composable
fun CashInOutView(
    leaveView: () -> Unit = {},
    viewModel: PayInOutViewModel = hiltViewModel()
) {
    // Get activity context
    val context = LocalContext.current
    
    // State to detect if we should force leave due to logout
    var shouldExitDueToLogout by remember { mutableStateOf(false) }
    
    // Observe login state changes
    val userLoggedIn by viewModel.userLoggedIn.collectAsStateWithLifecycle()
    
    // Monitor for logout and navigate to login screen
    LaunchedEffect(userLoggedIn) {
        if (!userLoggedIn) {
            // Short delay to ensure logout has completed
            delay(300)
            shouldExitDueToLogout = true
        }
    }
    
    // Navigate to user screen if logged out
    LaunchedEffect(shouldExitDueToLogout) {
        if (shouldExitDueToLogout) {
            // Navigate back to login/user screen
            leaveView()
        }
    }
    
    // Periodically check login status as a failsafe
    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            if (viewModel.checkLogoutStatus()) {
                shouldExitDueToLogout = true
            }
        }
    }

    // Disable back button functionality for users with only can_topup privilege
    val loginState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    if (!loginState.hasOnlyTopUpPrivilege()) {
        BackHandler {
            leaveView()
        }
    } else {
        // For users with only can_topup privilege, prevent back button functionality
        BackHandler {}
    }

    val activeTab by viewModel.activeCashInOutTab.collectAsStateWithLifecycle()
    val tabList by viewModel.tabList.collectAsStateWithLifecycle()

    val navController = rememberNavController()

    LaunchedEffect(activeTab) {
        if (activeTab < tabList.size) {
            navController.navigateTo(
                tabList[activeTab].route
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(loginState.title().title) },
                // Only show back button if user does not have only the can_topup privilege
                icon = if (!loginState.hasOnlyTopUpPrivilege()) {
                    TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                        leaveView()
                    }
                } else null,
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues)) {

            if (tabList.isEmpty()) {
                ErrorScreen(onDismiss = leaveView) {
                    Text("no action available", fontSize = 28.sp)
                }
            } else {
                val startRoute = tabList[0].route

                // show tab bar only if there's multiple tabs
                if (tabList.size > 1) {
                    TabRow(selectedTabIndex = activeTab) {
                        tabList.forEachIndexed { idx, elem ->
                            Tab(
                                text = { Text(elem.title) },
                                selected = activeTab == idx,
                                onClick = { viewModel.cashInOutTabSelected(idx) }
                            )
                        }
                    }
                }

                NavHost(
                    navController = navController,
                    startDestination = startRoute,
                ) {
                    composable(CashInOutTab.TopUp.route) {
                        TopUpView()
                    }
                    composable(CashInOutTab.PayOut.route) {
                        PayOutView()
                    }
                }
            }
        }
    }
}
