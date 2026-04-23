package de.stustapay.stustapay.ui.root

import android.content.pm.ActivityInfo
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.LinearProgressIndicator
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.DeveloperMode
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceSectionHeader
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.nav.NavDest

private const val TOP_OVERSCROLL_REFRESH_THRESHOLD_PX = 96f

@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    loginState: TerminalLoginState,
    configLoading: Boolean,
    terminalStatusMessage: String?,
    terminalConfigViewModel: TerminalConfigViewModel = hiltViewModel(),
) {
    val activity = LocalActivity.current!!
    val selfServiceAccess = loginState.selfServiceAccess()
    val isSelfServiceMode = loginState.isSelfServiceTerminal() && loginState.hasConfig() && !configLoading
    val isEntryMode = loginState.isEntryMode() && loginState.hasConfig() && !configLoading
    val gradientColors = if (isSelfServiceMode) {
        listOf(SelfServicePalette.backgroundTop, SelfServicePalette.backgroundBottom)
    } else {
        listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)
    }
    var showInfoDialog by remember { mutableStateOf(false) }

    val navigateToHook = { dest: NavDest ->
        if (!configLoading || dest == RootNavDests.settings) {
            navigateTo(dest)
        }
    }

    LaunchedEffect(isEntryMode) {
        if (isEntryMode) {
            navigateToHook(RootNavDests.entry)
        }
    }

    LaunchedEffect(isSelfServiceMode) {
        if (!isSelfServiceMode) {
            terminalConfigViewModel.refreshAccessData()
        }
    }

    if (isEntryMode) {
        Box(modifier = Modifier.fillMaxSize())
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (isSelfServiceMode) {
                SelfServiceLanding(
                    canCheckBalance = selfServiceAccess.canSelfServiceBalance,
                    canTopUp = selfServiceAccess.canSelfServiceTopUp,
                    configLoading = configLoading,
                    onCheckBalance = { navigateToHook(RootNavDests.status) },
                    onTopUp = { navigateToHook(RootNavDests.topup) },
                    onRefreshConfig = { terminalConfigViewModel.refreshAccessData() },
                    onShowTerminalInfo = { showInfoDialog = true },
                    onOpenSettings = { navigateToHook(RootNavDests.settings) },
                    fallbackMessage = terminalStatusMessage ?: stringResource(R.string.payinout_no_action_available),
                    modifier = Modifier.weight(1f)
                )
            } else {
                OperatorLanding(
                    modifier = Modifier.weight(1f),
                    loginState = loginState,
                    configLoading = configLoading,
                    terminalStatusMessage = terminalStatusMessage,
                    onNavigate = navigateToHook,
                    onRefreshConfig = { terminalConfigViewModel.refreshAccessData() },
                    onRestart = { restartApp(activity) },
                    onRotateScreen = {
                        when (activity.requestedOrientation) {
                            ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE -> {
                                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE
                            }
                            ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE -> {
                                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                            }
                            ActivityInfo.SCREEN_ORIENTATION_PORTRAIT -> {
                                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT
                            }
                            ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT -> {
                                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                            }
                            else -> {
                                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                            }
                        }
                    },
                )
            }
        }

        if (isSelfServiceMode && showInfoDialog) {
            Dialog(onDismissRequest = { showInfoDialog = false }) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = SelfServicePalette.panel,
                    elevation = 8.dp,
                ) {
                    Column(
                        modifier = Modifier
                            .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(16.dp))
                            .padding(16.dp)
                            .widthIn(min = 260.dp, max = 360.dp)
                    ) {
                        TerminalConfig(
                            viewModel = terminalConfigViewModel,
                            fetchConfig = false,
                            selfServiceMode = true,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            modifier = Modifier.align(Alignment.End),
                            onClick = { showInfoDialog = false }
                        ) {
                            Text(text = stringResource(R.string.done))
                        }
                    }
                }
            }
        }
    }
}

private data class OperatorMenuCard(
    val icon: ImageVector,
    val title: String,
    val description: String,
    val emphasized: Boolean = false,
    val onClick: () -> Unit,
)

@Composable
private fun OperatorLanding(
    loginState: TerminalLoginState,
    configLoading: Boolean,
    terminalStatusMessage: String?,
    onNavigate: (NavDest) -> Unit,
    onRefreshConfig: () -> Unit,
    onRestart: () -> Unit,
    onRotateScreen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val terminalName = loginState.title()
    var showRestartDialog by remember { mutableStateOf(false) }
    val operatorStrings = rememberOperatorMenuStrings()
    val refreshState = remember { TopOverscrollRefreshState(TOP_OVERSCROLL_REFRESH_THRESHOLD_PX) }
    val primaryCards = remember(
        loginState,
        configLoading,
        terminalStatusMessage,
        operatorStrings,
        onNavigate,
        onRefreshConfig,
        onRestart,
    ) {
        buildList {
            if (loginState.isEntryMode()) {
                add(
                    OperatorMenuCard(
                        icon = Icons.Filled.MeetingRoom,
                        title = operatorStrings.entryTitle,
                        description = operatorStrings.descriptionByRoute.getValue(RootNavDests.entry.route),
                        onClick = { onNavigate(RootNavDests.entry) },
                    )
                )
            }

            startpageItems.forEach { item ->
                if (loginState.checkAccess(item.canAccess)) {
                    add(item.toOperatorCard(operatorStrings, onNavigate))
                }
            }

            if (loginState.checkTerminalAccess(Access::canChangeConfig) || !loginState.hasConfig()) {
                add(
                    OperatorMenuCard(
                        icon = Icons.Filled.Edit,
                        title = operatorStrings.settingsTitle,
                        description = operatorStrings.settingsDescription,
                        onClick = { onNavigate(RootNavDests.settings) },
                    )
                )
            }

            if (!loginState.hasConfig() || configLoading || !terminalStatusMessage.isNullOrBlank()) {
                add(
                    OperatorMenuCard(
                        icon = Icons.Filled.Refresh,
                        title = operatorStrings.refreshTitle,
                        description = operatorStrings.refreshDescription,
                        emphasized = true,
                        onClick = onRefreshConfig,
                    )
                )
            }

            if (loginState.checkAccess { user, _ -> Access.canHackTheSystem(user) }) {
                add(
                    OperatorMenuCard(
                        icon = Icons.Filled.DeveloperMode,
                        title = operatorStrings.developmentTitle,
                        description = operatorStrings.developmentDescription,
                        onClick = { onNavigate(RootNavDests.development) },
                    )
                )
            }
            add(
                OperatorMenuCard(
                    icon = Icons.Filled.Refresh,
                    title = operatorStrings.restartTitle,
                    description = operatorStrings.restartDescription,
                    onClick = { showRestartDialog = true },
                )
            )
        }
    }

    OperatorScaffold(
        modifier = modifier,
        title = terminalName.title.ifBlank { stringResource(R.string.operator_console_title) },
        subtitle = terminalName.subtitle ?: if (loginState.hasConfig()) {
            stringResource(R.string.operator_console_subtitle_ready)
        } else {
            stringResource(R.string.operator_console_subtitle_setup)
        },
        icon = Icons.Filled.Edit,
        iconPainter = painterResource(id = R.drawable.tfpay_logo_mark),
        terminalLabel = "",
        languageLabel = "",
        footerHint = when {
            !loginState.hasConfig() -> stringResource(R.string.operator_settings_desc)
            configLoading -> stringResource(R.string.operator_console_footer_loading)
            else -> stringResource(R.string.operator_console_footer_workflows_visible, primaryCards.size)
        },
        footerSection = stringResource(R.string.operator_console_footer_section),
        footerStatus = if (loginState.hasConfig()) {
            stringResource(R.string.operator_console_footer_ready)
        } else {
            stringResource(R.string.operator_console_footer_setup)
        },
        showFooter = false,
        headerAction = {
            IconButton(
                onClick = onRotateScreen,
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = OperatorPalette.accent,
                        shape = RoundedCornerShape(14.dp),
                    )
                    .border(
                        width = 1.5.dp,
                        color = Color.White.copy(alpha = 0.18f),
                        shape = RoundedCornerShape(14.dp),
                    ),
            ) {
                Icon(
                    imageVector = Icons.Filled.ScreenRotation,
                    contentDescription = stringResource(R.string.content_desc_rotate_screen),
                    tint = OperatorPalette.backgroundTop,
                    modifier = Modifier.size(22.dp),
                )
            }
        },
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = when {
                maxWidth >= 1240.dp -> 3
                maxWidth >= 860.dp -> 2
                else -> 1
            }
            val cardRows = remember(primaryCards, columns) { primaryCards.chunked(columns) }
            val scrollState = rememberScrollState()
            val overscrollModifier = rememberTopOverscrollRefreshModifier(
                scrollState = scrollState,
                configLoading = configLoading,
                refreshState = refreshState,
                onRefresh = onRefreshConfig,
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .then(overscrollModifier)
                    .verticalScroll(scrollState),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                if (!loginState.hasConfig()) {
                    OperatorInfoCard(
                        title = stringResource(R.string.operator_setup_required),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = stringResource(R.string.operator_setup_required_desc),
                            color = OperatorPalette.subtitle,
                            fontSize = 18.sp,
                            lineHeight = 24.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        if (!terminalStatusMessage.isNullOrBlank()) {
                            Divider(
                                modifier = Modifier.padding(vertical = 4.dp),
                                color = OperatorPalette.panelBorder,
                                thickness = 1.dp,
                            )
                            Text(
                                text = stringResource(R.string.operator_configuration_status),
                                color = OperatorPalette.title,
                                fontSize = 18.sp,
                                lineHeight = 24.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = terminalStatusMessage,
                                color = OperatorPalette.subtitle,
                                fontSize = 18.sp,
                                lineHeight = 24.sp,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                    }
                } else if (!terminalStatusMessage.isNullOrBlank()) {
                    OperatorInfoCard(
                        title = stringResource(R.string.operator_configuration_status),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = terminalStatusMessage,
                            color = OperatorPalette.subtitle,
                            fontSize = 18.sp,
                            lineHeight = 24.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }

                cardRows.forEach { rowItems ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        rowItems.forEach { item ->
                            OperatorActionCard(
                                title = item.title,
                                description = item.description,
                                icon = item.icon,
                                emphasized = item.emphasized,
                                onClick = item.onClick,
                                modifier = Modifier.weight(1f),
                            )
                        }

                        repeat(columns - rowItems.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }

                LandingRefreshStatus(
                    loading = configLoading,
                    message = stringResource(R.string.operator_refreshing_setup_hint),
                )
            }
        }
    }

    if (showRestartDialog) {
        Dialog(onDismissRequest = { showRestartDialog = false }) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                OperatorPanel(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 560.dp)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.operator_restart_confirm_title),
                            color = OperatorPalette.title,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = stringResource(R.string.operator_restart_confirm_desc),
                            color = OperatorPalette.subtitle,
                            fontSize = 18.sp,
                            lineHeight = 24.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.operator_restart_confirm_action),
                            destructive = true,
                            onClick = {
                                showRestartDialog = false
                                onRestart()
                            },
                        )
                        OperatorActionButton(
                            text = stringResource(R.string.common_action_cancel),
                            primary = false,
                            onClick = { showRestartDialog = false },
                        )
                    }
                }
            }
        }
    }
}

private data class OperatorMenuStrings(
    val entryTitle: String,
    val settingsTitle: String,
    val settingsDescription: String,
    val refreshTitle: String,
    val refreshDescription: String,
    val developmentTitle: String,
    val developmentDescription: String,
    val restartTitle: String,
    val restartDescription: String,
    val labelByResource: Map<Int, String>,
    val descriptionByRoute: Map<String, String>,
    val defaultDescription: String,
)

private fun StartpageItem.toOperatorCard(
    strings: OperatorMenuStrings,
    onNavigate: (NavDest) -> Unit
): OperatorMenuCard {
    val destination = navDestination
    return OperatorMenuCard(
        icon = icon,
        title = strings.labelByResource.getValue(label),
        description = destination?.route?.let(strings.descriptionByRoute::get) ?: strings.defaultDescription,
        emphasized = destination == RootNavDests.sale || destination == RootNavDests.topup,
        onClick = {
            if (destination != null) {
                onNavigate(destination)
            }
        },
    )
}

@Composable
private fun rememberOperatorMenuStrings(): OperatorMenuStrings {
    val entryTitle = stringResource(R.string.root_item_entry)
    val settingsTitle = stringResource(R.string.root_item_settings)
    val settingsDescription = stringResource(R.string.operator_settings_desc)
    val refreshTitle = stringResource(R.string.operator_refresh_setup_title)
    val refreshDescription = stringResource(R.string.operator_refresh_setup_desc)
    val developmentTitle = stringResource(R.string.root_item_development)
    val developmentDescription = stringResource(R.string.operator_development_desc)
    val restartTitle = stringResource(R.string.root_item_restart_app)
    val restartDescription = stringResource(R.string.operator_restart_desc)
    val defaultDescription = stringResource(R.string.operator_workflow_default_desc)
    val saleTitle = stringResource(R.string.root_item_sale)
    val topUpTitle = stringResource(R.string.root_item_topup)
    val postPaymentTitle = stringResource(R.string.root_item_post_payment)
    val ticketTitle = stringResource(R.string.root_item_ticket)
    val rewardsTitle = stringResource(R.string.root_item_rewards)
    val historyTitle = stringResource(R.string.history_title)
    val customerTitle = stringResource(R.string.customer_title)
    val swapTitle = stringResource(R.string.customer_swap)
    val managementTitle = stringResource(R.string.management_title)
    val vaultTitle = stringResource(R.string.management_vault_title)
    val statsTitle = stringResource(R.string.root_item_stats)
    val entryDescription = stringResource(R.string.operator_workflow_entry_desc)
    val saleDescription = stringResource(R.string.operator_workflow_sale_desc)
    val topUpDescription = stringResource(R.string.operator_workflow_topup_desc)
    val postPaymentDescription = stringResource(R.string.operator_workflow_postpayment_desc)
    val ticketDescription = stringResource(R.string.operator_workflow_ticket_desc)
    val rewardsDescription = stringResource(R.string.operator_workflow_rewards_desc)
    val historyDescription = stringResource(R.string.operator_workflow_history_desc)
    val statusDescription = stringResource(R.string.operator_workflow_status_desc)
    val swapDescription = stringResource(R.string.operator_workflow_swap_desc)
    val cashierDescription = stringResource(R.string.operator_workflow_cashier_desc)
    val vaultDescription = stringResource(R.string.operator_workflow_vault_desc)
    val statsDescription = stringResource(R.string.operator_workflow_stats_desc)

    val labelByResource = remember(
        saleTitle,
        topUpTitle,
        postPaymentTitle,
        ticketTitle,
        rewardsTitle,
        historyTitle,
        customerTitle,
        swapTitle,
        managementTitle,
        vaultTitle,
        statsTitle,
    ) {
        mapOf(
            R.string.root_item_sale to saleTitle,
            R.string.root_item_topup to topUpTitle,
            R.string.root_item_post_payment to postPaymentTitle,
            R.string.root_item_ticket to ticketTitle,
            R.string.root_item_rewards to rewardsTitle,
            R.string.history_title to historyTitle,
            R.string.customer_title to customerTitle,
            R.string.customer_swap to swapTitle,
            R.string.management_title to managementTitle,
            R.string.management_vault_title to vaultTitle,
            R.string.root_item_stats to statsTitle,
        )
    }

    val descriptionByRoute = remember(
        entryDescription,
        saleDescription,
        topUpDescription,
        postPaymentDescription,
        ticketDescription,
        rewardsDescription,
        historyDescription,
        statusDescription,
        swapDescription,
        cashierDescription,
        vaultDescription,
        statsDescription,
    ) {
        mapOf(
            RootNavDests.entry.route to entryDescription,
            RootNavDests.sale.route to saleDescription,
            RootNavDests.topup.route to topUpDescription,
            RootNavDests.postpayment.route to postPaymentDescription,
            RootNavDests.ticket.route to ticketDescription,
            RootNavDests.rewards.route to rewardsDescription,
            RootNavDests.history.route to historyDescription,
            RootNavDests.status.route to statusDescription,
            RootNavDests.swap.route to swapDescription,
            RootNavDests.cashier.route to cashierDescription,
            RootNavDests.vault.route to vaultDescription,
            RootNavDests.stats.route to statsDescription,
        )
    }

    return remember(
        entryTitle,
        settingsTitle,
        settingsDescription,
        refreshTitle,
        refreshDescription,
        developmentTitle,
        developmentDescription,
        restartTitle,
        restartDescription,
        labelByResource,
        descriptionByRoute,
        defaultDescription,
    ) {
        OperatorMenuStrings(
            entryTitle = entryTitle,
            settingsTitle = settingsTitle,
            settingsDescription = settingsDescription,
            refreshTitle = refreshTitle,
            refreshDescription = refreshDescription,
            developmentTitle = developmentTitle,
            developmentDescription = developmentDescription,
            restartTitle = restartTitle,
            restartDescription = restartDescription,
            labelByResource = labelByResource,
            descriptionByRoute = descriptionByRoute,
            defaultDescription = defaultDescription,
        )
    }
}

@Composable
private fun SelfServiceLanding(
    canCheckBalance: Boolean,
    canTopUp: Boolean,
    configLoading: Boolean,
    onCheckBalance: () -> Unit,
    onTopUp: () -> Unit,
    onRefreshConfig: () -> Unit,
    onShowTerminalInfo: () -> Unit,
    onOpenSettings: () -> Unit,
    fallbackMessage: String,
    modifier: Modifier = Modifier
) {
    val profile = rememberSelfServiceDeviceProfile()
    val refreshState = remember { TopOverscrollRefreshState(TOP_OVERSCROLL_REFRESH_THRESHOLD_PX) }
    val checkBalanceTitle = stringResource(R.string.selfservice_check_balance)
    val checkBalanceDescription = stringResource(R.string.selfservice_check_balance_hint)
    val topUpTitle = stringResource(R.string.selfservice_topup)
    val topUpDescription = stringResource(R.string.selfservice_topup_hint)
    val openAction = stringResource(R.string.selfservice_action_open)
    val startAction = stringResource(R.string.selfservice_action_start)
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val scrollState = rememberScrollState()
        val actionCards = remember(
            canCheckBalance,
            canTopUp,
            checkBalanceTitle,
            checkBalanceDescription,
            topUpTitle,
            topUpDescription,
            openAction,
            startAction,
            onCheckBalance,
            onTopUp,
        ) {
            buildList {
                if (canCheckBalance) {
                    add(
                        SelfServiceActionCardState(
                            icon = Icons.Outlined.AccountBalanceWallet,
                            title = checkBalanceTitle,
                            description = checkBalanceDescription,
                            ctaText = openAction,
                            onClick = onCheckBalance,
                            highlighted = false,
                        )
                    )
                }
                if (canTopUp) {
                    add(
                        SelfServiceActionCardState(
                            icon = Icons.Outlined.AddCircle,
                            title = topUpTitle,
                            description = topUpDescription,
                            ctaText = startAction,
                            onClick = onTopUp,
                            highlighted = true,
                        )
                    )
                }
            }
        }
        val compactLayout = profile.isSmallScreen || maxWidth < 740.dp
        val stackedFooterActions = maxWidth < 640.dp
        val actionTitleSize = if (compactLayout) profile.actionCardTitleSize else 36.sp
        val actionDescriptionSize = if (compactLayout) profile.actionCardDescriptionSize else 22.sp
        val cardHeight = if (compactLayout) {
            if (profile.isSmallScreen) 156.dp else 190.dp
        } else {
            320.dp
        }
        val overscrollModifier = rememberTopOverscrollRefreshModifier(
            scrollState = scrollState,
            configLoading = configLoading,
            refreshState = refreshState,
            onRefresh = onRefreshConfig,
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .then(overscrollModifier)
                .verticalScroll(scrollState)
                .fillMaxWidth()
                .padding(
                    horizontal = profile.contentPaddingHorizontal,
                    vertical = profile.contentPaddingVertical
                ),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                if (actionCards.isEmpty()) {
                    SelfServiceEmptyStateCard(
                        message = fallbackMessage,
                        modifier = Modifier.fillMaxWidth(),
                    )
                } else if (compactLayout || actionCards.size == 1) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        actionCards.forEach { action ->
                            SelfServiceActionCard(
                                icon = action.icon,
                                title = action.title,
                                description = action.description,
                                ctaText = action.ctaText,
                                onClick = action.onClick,
                                highlighted = action.highlighted,
                                modifier = Modifier.fillMaxWidth(),
                                titleSize = actionTitleSize,
                                descriptionSize = actionDescriptionSize,
                                cardHeight = cardHeight
                            )
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        actionCards.forEach { action ->
                            SelfServiceActionCard(
                                icon = action.icon,
                                title = action.title,
                                description = action.description,
                                ctaText = action.ctaText,
                                onClick = action.onClick,
                                highlighted = action.highlighted,
                                modifier = Modifier.weight(1f),
                                titleSize = actionTitleSize,
                                descriptionSize = actionDescriptionSize,
                                cardHeight = cardHeight
                            )
                        }
                    }
                }
            }

            LandingRefreshStatus(
                loading = configLoading,
                message = stringResource(R.string.operator_refreshing_setup_hint),
                accentColor = SelfServicePalette.accent,
                textColor = SelfServicePalette.title,
                trackColor = SelfServicePalette.panelBorder,
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = SelfServicePalette.panelMuted,
                shape = RoundedCornerShape(12.dp),
                elevation = 0.dp
            ) {
                val footerModifier = Modifier
                    .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(12.dp))
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 12.dp)

                if (stackedFooterActions) {
                    Column(
                        modifier = footerModifier,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        SelfServiceFooterActionButton(
                            onClick = onShowTerminalInfo,
                            icon = Icons.Filled.Info,
                            text = stringResource(R.string.selfservice_action_terminal_info),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        SelfServiceFooterActionButton(
                            onClick = onOpenSettings,
                            icon = Icons.Filled.Edit,
                            text = stringResource(R.string.root_item_settings),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                } else {
                    Row(
                        modifier = footerModifier,
                        horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SelfServiceFooterActionButton(
                            onClick = onShowTerminalInfo,
                            icon = Icons.Filled.Info,
                            text = stringResource(R.string.selfservice_action_terminal_info),
                            modifier = Modifier.widthIn(min = 170.dp)
                        )
                        SelfServiceFooterActionButton(
                            onClick = onOpenSettings,
                            icon = Icons.Filled.Edit,
                            text = stringResource(R.string.root_item_settings),
                            modifier = Modifier.widthIn(min = 140.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SelfServiceFooterActionButton(
    onClick: () -> Unit,
    icon: ImageVector,
    text: String,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.5.dp, SelfServicePalette.panelBorder),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = SelfServicePalette.panel,
            contentColor = SelfServicePalette.title,
            disabledBackgroundColor = SelfServicePalette.panelBorder,
            disabledContentColor = SelfServicePalette.subtitle
        ),
        elevation = ButtonDefaults.elevation(defaultElevation = 0.dp, pressedElevation = 0.dp),
        modifier = modifier
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = SelfServicePalette.subtitle
        )
        Text(
            text = text,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(start = 8.dp)
        )
    }
}

private data class SelfServiceActionCardState(
    val icon: ImageVector,
    val title: String,
    val description: String,
    val ctaText: String,
    val onClick: () -> Unit,
    val highlighted: Boolean,
)

@Composable
private fun rememberTopOverscrollRefreshModifier(
    scrollState: androidx.compose.foundation.ScrollState,
    configLoading: Boolean,
    refreshState: TopOverscrollRefreshState,
    onRefresh: () -> Unit,
): Modifier {
    return Modifier.pointerInput(scrollState, configLoading, refreshState, onRefresh) {
        awaitPointerEventScope {
            while (true) {
                val event = awaitPointerEvent(pass = PointerEventPass.Initial)
                val pressed = event.changes.any { it.pressed }
                if (!pressed) {
                    refreshState.reset()
                    continue
                }

                val deltaY = event.changes.firstOrNull()?.positionChange()?.y ?: 0f
                val atTop = scrollState.value == 0
                if (refreshState.onDragDelta(deltaY, atTop = atTop, loading = configLoading)) {
                    onRefresh()
                }
            }
        }
    }
}

@Composable
private fun LandingRefreshStatus(
    loading: Boolean,
    message: String,
    accentColor: Color = OperatorPalette.accent,
    textColor: Color = OperatorPalette.subtitle,
    trackColor: Color = Color.White.copy(alpha = 0.1f),
) {
    if (!loading) {
        return
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = message,
            color = textColor,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        LinearProgressIndicator(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp),
            color = accentColor,
            backgroundColor = trackColor,
        )
    }
}

@Composable
private fun SelfServiceEmptyStateCard(
    message: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        backgroundColor = SelfServicePalette.panelMuted,
        shape = RoundedCornerShape(16.dp),
        elevation = 0.dp,
    ) {
        Text(
            text = message,
            color = SelfServicePalette.subtitle,
            fontWeight = FontWeight.Medium,
            fontSize = 16.sp,
            lineHeight = 22.sp,
            modifier = Modifier
                .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(16.dp))
                .padding(horizontal = 18.dp, vertical = 16.dp)
                .fillMaxWidth()
        )
    }
}

@Composable
private fun SelfServiceActionCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    description: String,
    ctaText: String,
    onClick: () -> Unit,
    highlighted: Boolean,
    titleSize: androidx.compose.ui.unit.TextUnit,
    descriptionSize: androidx.compose.ui.unit.TextUnit,
    cardHeight: androidx.compose.ui.unit.Dp
) {
    Card(
        modifier = modifier
            .height(cardHeight)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        elevation = 0.dp,
        backgroundColor = if (highlighted) Color(0xFF243A63) else SelfServicePalette.panel,
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .border(
                    width = if (highlighted) 2.dp else 1.5.dp,
                    color = if (highlighted) SelfServicePalette.accent else SelfServicePalette.panelBorder,
                    shape = RoundedCornerShape(16.dp)
                )
                .padding(if (cardHeight >= 220.dp) 24.dp else 18.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(if (cardHeight >= 220.dp) 18.dp else 12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(if (cardHeight >= 220.dp) 68.dp else 52.dp)
                    .background(SelfServicePalette.accent, shape = RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = SelfServicePalette.backgroundTop,
                    modifier = Modifier.size(if (cardHeight >= 220.dp) 34.dp else 26.dp)
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(if (cardHeight >= 220.dp) 6.dp else 2.dp)
            ) {
                Text(
                    text = title,
                    color = SelfServicePalette.title,
                    fontSize = titleSize,
                    lineHeight = titleSize,
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = description,
                    color = SelfServicePalette.subtitle,
                    fontSize = descriptionSize,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = ctaText,
                    color = SelfServicePalette.accent,
                    fontSize = if (cardHeight >= 220.dp) 22.sp else if (descriptionSize <= 13.sp) 15.sp else 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = SelfServicePalette.accent,
                modifier = Modifier.size(if (cardHeight >= 220.dp) 36.dp else 28.dp)
            )
        }
    }
}
