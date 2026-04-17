package de.stustapay.stustapay.ui.payinout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.Scaffold
import androidx.compose.material.Tab
import androidx.compose.material.TabRow
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.BackHandler
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorBackground
import de.stustapay.stustapay.ui.common.operator.OperatorCompactFlowHeader
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import de.stustapay.stustapay.ui.nav.navigateTo
import de.stustapay.stustapay.ui.payinout.payout.PayOutView
import de.stustapay.stustapay.ui.payinout.topup.TopUpView
import kotlinx.coroutines.delay


@Composable
fun CashInOutView(
    leaveView: () -> Unit = {},
    viewModel: PayInOutViewModel = hiltViewModel()
) {
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

    val loginState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val selfServiceAccess = loginState.selfServiceAccess()
    val isSelfServiceMode = loginState.isSelfServiceTerminal()
    BackHandler {
        leaveView()
    }

    val activeTab by viewModel.activeCashInOutTab.collectAsStateWithLifecycle()
    val tabList by viewModel.tabList.collectAsStateWithLifecycle()

    val navController = rememberNavController()

    LaunchedEffect(isSelfServiceMode, selfServiceAccess.canSelfServiceTopUp) {
        if (isSelfServiceMode && !selfServiceAccess.canSelfServiceTopUp) {
            leaveView()
        }
    }

    LaunchedEffect(activeTab, tabList) {
        if (tabList.isEmpty()) {
            return@LaunchedEffect
        }

        val safeActiveTab = activeTab.coerceIn(0, tabList.lastIndex)
        if (safeActiveTab != activeTab) {
            viewModel.cashInOutTabSelected(safeActiveTab)
            return@LaunchedEffect
        }

        navController.navigateTo(tabList[safeActiveTab].route)
    }

    if (isSelfServiceMode) {
        Scaffold(topBar = { }) { paddingValues ->
            Column(
                modifier = Modifier
                    .padding(paddingValues)
                    .fillMaxSize(),
            ) {
                CashInOutNavHost(
                    tabList = tabList,
                    activeTab = activeTab,
                    navController = navController,
                    viewModel = viewModel,
                    leaveView = leaveView,
                    isSelfServiceMode = true,
                )
            }
        }
    } else {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val compactHeader = maxWidth < 760.dp
            OperatorBackground {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (tabList.isNotEmpty()) {
                        val headerIdx = activeTab.coerceIn(0, tabList.lastIndex)
                        OperatorCompactFlowHeader(
                            flowTitle = stringResource(tabList[headerIdx].titleRes),
                            tillLabel = loginState.title().title.takeIf { it.isNotBlank() },
                            onBack = leaveView,
                            compactHandheld = compactHeader,
                        )
                    }
                    CashInOutNavHost(
                        tabList = tabList,
                        activeTab = activeTab,
                        navController = navController,
                        viewModel = viewModel,
                        leaveView = leaveView,
                        isSelfServiceMode = false,
                    )
                }
            }
        }
    }
}

@Composable
private fun ColumnScope.CashInOutNavHost(
    tabList: List<CashInOutTab>,
    activeTab: Int,
    navController: NavHostController,
    viewModel: PayInOutViewModel,
    leaveView: () -> Unit,
    isSelfServiceMode: Boolean,
) {
    if (tabList.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f, fill = true),
            contentAlignment = Alignment.Center,
        ) {
            OperatorInfoCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 560.dp),
                title = stringResource(R.string.payinout_no_action_available),
            ) {
                Text(
                    text = stringResource(R.string.payinout_unavailable_desc),
                    color = OperatorPalette.subtitle,
                    fontSize = 18.sp,
                    lineHeight = 24.sp,
                )
                OperatorSecondaryButton(
                    text = stringResource(R.string.back),
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    onClick = leaveView,
                )
            }
        }
        return
    }

    val startRoute = tabList[0].route

    if (tabList.size > 1) {
        TabRow(
            selectedTabIndex = activeTab,
            backgroundColor = Color.Transparent,
            contentColor = OperatorPalette.title,
        ) {
            tabList.forEachIndexed { idx, elem ->
                Tab(
                    text = { Text(stringResource(elem.titleRes)) },
                    selected = activeTab == idx,
                    onClick = { viewModel.cashInOutTabSelected(idx) }
                )
            }
        }
    }

    Box(modifier = Modifier.fillMaxWidth().weight(1f, fill = true)) {
        NavHost(
            navController = navController,
            startDestination = startRoute,
        ) {
            composable(CashInOutTab.TopUp.route) {
                TopUpView(
                    onFinished = if (isSelfServiceMode) {
                        leaveView
                    } else null
                )
            }
            composable(CashInOutTab.PayOut.route) {
                PayOutView()
            }
        }
    }
}
