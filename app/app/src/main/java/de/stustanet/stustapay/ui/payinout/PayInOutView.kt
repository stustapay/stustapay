package de.stustanet.stustapay.ui.payinout

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.navigateTo

import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Column
import androidx.compose.material.Scaffold
import androidx.compose.material.Tab
import androidx.compose.material.TabRow
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.payinout.payout.PayOutView
import de.stustanet.stustapay.ui.payinout.topup.TopUpView
import de.stustanet.stustapay.ui.common.pay.ErrorScreen
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon


@Composable
fun CashInOutView(
    leaveView: () -> Unit = {},
    viewModel: PayInOutViewModel = hiltViewModel()
) {
    BackHandler {
        leaveView()
    }

    val loginState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
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
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                    leaveView()
                },
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
