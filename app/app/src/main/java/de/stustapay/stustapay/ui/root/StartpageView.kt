package de.stustapay.stustapay.ui.root

import android.content.pm.ActivityInfo
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
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
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.DeveloperMode
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.filled.Settings
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceSectionHeader
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.nav.NavDest

@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel(),
    terminalConfigViewModel: TerminalConfigViewModel = hiltViewModel()
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
    val terminalStatusMessage by viewModel.terminalStatusMessage.collectAsStateWithLifecycle()
    val activity = LocalActivity.current!!
    val isSelfServiceMode = loginState.hasOnlyTopUpPrivilege() && loginState.hasConfig() && !configLoading
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
        IconButton(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 15.dp, start = 20.dp)
                .size(30.dp),
            onClick = {
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
        ) {
            Icon(
                imageVector = Icons.Filled.ScreenRotation,
                contentDescription = stringResource(R.string.content_desc_rotate_screen),
                tint = if (isSelfServiceMode) SelfServicePalette.subtitle else MaterialTheme.colors.onSurface
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (isSelfServiceMode) {
                SelfServiceLanding(
                    onCheckBalance = { navigateToHook(RootNavDests.status) },
                    onTopUp = { navigateToHook(RootNavDests.topup) },
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
                )
            }
        }

        if (isSelfServiceMode) {
            IconButton(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 12.dp, end = 16.dp)
                    .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(18.dp))
                    .padding(16.dp)
                    .size(36.dp),
                onClick = { showInfoDialog = true }
            ) {
                Icon(
                    imageVector = Icons.Filled.Info,
                    contentDescription = stringResource(R.string.content_desc_terminal_info),
                    tint = SelfServicePalette.subtitle
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
                        TerminalConfig(viewModel = terminalConfigViewModel, fetchConfig = false)
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
    modifier: Modifier = Modifier,
) {
    val terminalName = loginState.title()
    val primaryCards = buildList {
        if (loginState.hasConfig()) {
            add(
                OperatorMenuCard(
                    icon = Icons.Filled.Person,
                    title = stringResource(R.string.user_title),
                    description = stringResource(R.string.operator_user_desc),
                    onClick = { onNavigate(RootNavDests.user) },
                )
            )
        }

        val entryItem = if (loginState.isEntryMode()) {
            StartpageItem(
                icon = Icons.Filled.MeetingRoom,
                label = R.string.root_item_entry,
                navDestination = RootNavDests.entry,
            )
        } else {
            null
        }

        if (entryItem != null) {
            add(entryItem.toOperatorCard(onNavigate))
        }

        startpageItems.forEach { item ->
            if (loginState.checkAccess(item.canAccess)) {
                add(item.toOperatorCard(onNavigate))
            }
        }

        if (loginState.checkAccess { user, _ -> Access.canChangeConfig(user) } || !loginState.hasConfig()) {
            add(
                OperatorMenuCard(
                    icon = Icons.Filled.Settings,
                    title = stringResource(R.string.root_item_settings),
                    description = stringResource(R.string.operator_settings_desc),
                    onClick = { onNavigate(RootNavDests.settings) },
                )
            )
        }

        if (!loginState.hasConfig() || configLoading || !terminalStatusMessage.isNullOrBlank()) {
            add(
                OperatorMenuCard(
                    icon = Icons.Filled.Refresh,
                    title = stringResource(R.string.operator_refresh_setup_title),
                    description = stringResource(R.string.operator_refresh_setup_desc),
                    emphasized = true,
                    onClick = onRefreshConfig,
                )
            )
        }

        if (loginState.checkAccess { user, _ -> Access.canHackTheSystem(user) }) {
            add(
                OperatorMenuCard(
                    icon = Icons.Filled.DeveloperMode,
                    title = stringResource(R.string.root_item_development),
                    description = stringResource(R.string.operator_development_desc),
                    onClick = { onNavigate(RootNavDests.development) },
                )
            )
        }
        add(
            OperatorMenuCard(
                icon = Icons.Filled.Refresh,
                title = stringResource(R.string.root_item_restart_app),
                description = stringResource(R.string.operator_restart_desc),
                onClick = onRestart,
            )
        )
    }

    OperatorScaffold(
        modifier = modifier,
        title = terminalName.title.ifBlank { stringResource(R.string.operator_console_title) },
        subtitle = terminalName.subtitle ?: if (loginState.hasConfig()) {
            stringResource(R.string.operator_console_subtitle_ready)
        } else {
            stringResource(R.string.operator_console_subtitle_setup)
        },
        icon = Icons.Filled.Settings,
        terminalLabel = when {
            configLoading -> stringResource(R.string.operator_console_loading)
            loginState.hasConfig() -> stringResource(R.string.operator_console_configured)
            else -> stringResource(R.string.operator_console_no_config)
        },
        footerHint = if (configLoading) {
            stringResource(R.string.operator_console_footer_loading)
        } else {
            stringResource(R.string.operator_console_footer_workflows_visible, primaryCards.size)
        },
        footerSection = stringResource(R.string.operator_console_footer_section),
        footerStatus = if (loginState.hasConfig()) {
            stringResource(R.string.operator_console_footer_ready)
        } else {
            stringResource(R.string.operator_console_footer_setup)
        },
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = when {
                maxWidth >= 1240.dp -> 3
                maxWidth >= 860.dp -> 2
                else -> 1
            }
            val cardRows = primaryCards.chunked(columns)
            val scrollState = rememberScrollState()

            Column(
                modifier = Modifier
                    .fillMaxSize()
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
                    }
                }

                if (!terminalStatusMessage.isNullOrBlank()) {
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
            }
        }
    }
}

@Composable
private fun StartpageItem.toOperatorCard(onNavigate: (NavDest) -> Unit): OperatorMenuCard {
    val destination = navDestination
    return OperatorMenuCard(
        icon = icon,
        title = stringResource(label),
        description = operatorCardDescription(destination?.route),
        emphasized = destination == RootNavDests.sale || destination == RootNavDests.topup,
        onClick = {
            if (destination != null) {
                onNavigate(destination)
            }
        },
    )
}

@Composable
private fun operatorCardDescription(route: String?): String {
    return when (route) {
        RootNavDests.entry.route -> stringResource(R.string.operator_workflow_entry_desc)
        RootNavDests.sale.route -> stringResource(R.string.operator_workflow_sale_desc)
        RootNavDests.topup.route -> stringResource(R.string.operator_workflow_topup_desc)
        RootNavDests.postpayment.route -> stringResource(R.string.operator_workflow_postpayment_desc)
        RootNavDests.ticket.route -> stringResource(R.string.operator_workflow_ticket_desc)
        RootNavDests.rewards.route -> stringResource(R.string.operator_workflow_rewards_desc)
        RootNavDests.history.route -> stringResource(R.string.operator_workflow_history_desc)
        RootNavDests.status.route -> stringResource(R.string.operator_workflow_status_desc)
        RootNavDests.swap.route -> stringResource(R.string.operator_workflow_swap_desc)
        RootNavDests.cashier.route -> stringResource(R.string.operator_workflow_cashier_desc)
        RootNavDests.vault.route -> stringResource(R.string.operator_workflow_vault_desc)
        RootNavDests.stats.route -> stringResource(R.string.operator_workflow_stats_desc)
        else -> stringResource(R.string.operator_workflow_default_desc)
    }
}

@Composable
private fun SelfServiceLanding(
    onCheckBalance: () -> Unit,
    onTopUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    val profile = rememberSelfServiceDeviceProfile()
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val compactLayout = profile.isSmallScreen || maxWidth < 740.dp
        val headerSize = if (compactLayout) profile.headlineTitleSize else 48.sp
        val subSize = if (compactLayout) profile.headlineSubtitleSize else 20.sp
        val cardHeight = if (profile.isSmallScreen) 156.dp else 190.dp

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = profile.contentPaddingHorizontal,
                    vertical = profile.contentPaddingVertical
                ),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SelfServiceSectionHeader(
                title = stringResource(R.string.selfservice_title),
                subtitle = stringResource(R.string.selfservice_description),
                titleFontSize = headerSize,
                subtitleFontSize = subSize
            )

            if (compactLayout) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SelfServiceActionCard(
                        icon = Icons.Outlined.AccountBalanceWallet,
                        title = stringResource(R.string.selfservice_check_balance),
                        description = stringResource(R.string.selfservice_check_balance_hint),
                        ctaText = stringResource(R.string.selfservice_action_open),
                        onClick = onCheckBalance,
                        highlighted = false,
                        modifier = Modifier.fillMaxWidth(),
                        titleSize = profile.actionCardTitleSize,
                        descriptionSize = profile.actionCardDescriptionSize,
                        cardHeight = cardHeight
                    )

                    SelfServiceActionCard(
                        icon = Icons.Outlined.AddCircle,
                        title = stringResource(R.string.selfservice_topup),
                        description = stringResource(R.string.selfservice_topup_hint),
                        ctaText = stringResource(R.string.selfservice_action_start),
                        onClick = onTopUp,
                        highlighted = true,
                        modifier = Modifier.fillMaxWidth(),
                        titleSize = profile.actionCardTitleSize,
                        descriptionSize = profile.actionCardDescriptionSize,
                        cardHeight = cardHeight
                    )
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    SelfServiceActionCard(
                        icon = Icons.Outlined.AccountBalanceWallet,
                        title = stringResource(R.string.selfservice_check_balance),
                        description = stringResource(R.string.selfservice_check_balance_hint),
                        ctaText = stringResource(R.string.selfservice_action_open),
                        onClick = onCheckBalance,
                        highlighted = false,
                        modifier = Modifier.weight(1f),
                        titleSize = profile.actionCardTitleSize,
                        descriptionSize = profile.actionCardDescriptionSize,
                        cardHeight = cardHeight
                    )
                    SelfServiceActionCard(
                        icon = Icons.Outlined.AddCircle,
                        title = stringResource(R.string.selfservice_topup),
                        description = stringResource(R.string.selfservice_topup_hint),
                        ctaText = stringResource(R.string.selfservice_action_start),
                        onClick = onTopUp,
                        highlighted = true,
                        modifier = Modifier.weight(1f),
                        titleSize = profile.actionCardTitleSize,
                        descriptionSize = profile.actionCardDescriptionSize,
                        cardHeight = cardHeight
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Card(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = SelfServicePalette.panelMuted,
                shape = RoundedCornerShape(12.dp),
                elevation = 0.dp
            ) {
                Text(
                    text = stringResource(R.string.selfservice_hint_payment),
                    color = SelfServicePalette.subtitle,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Start,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                        .fillMaxWidth()
                )
            }
        }
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
                .padding(18.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(SelfServicePalette.accent, shape = RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = SelfServicePalette.backgroundTop,
                    modifier = Modifier.size(26.dp)
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp)
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
                    fontSize = if (descriptionSize <= 13.sp) 15.sp else 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = SelfServicePalette.accent,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}
