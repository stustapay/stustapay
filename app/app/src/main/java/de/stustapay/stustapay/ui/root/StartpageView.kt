package de.stustapay.stustapay.ui.root

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.ui.nav.NavDest
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material.icons.outlined.Info
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.compose.material.Surface
import androidx.compose.ui.window.Dialog
import de.stustapay.stustapay.ui.root.TerminalConfigViewModel

@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel(),
    terminalConfigViewModel: TerminalConfigViewModel = hiltViewModel()
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)
    val activity = LocalActivity.current!!
    val isSelfServiceMode = loginState.hasOnlyTopUpPrivilege() && loginState.hasConfig() && !configLoading
    var showInfoDialog by remember { mutableStateOf(false) }

    val navigateToHook = { dest: NavDest ->
        // Only allow navigation if we have a config, but always allow entering settings
        if (!configLoading || dest == RootNavDests.settings) {
            navigateTo(dest)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors))
    ) {
        // Place the IconButton in the Box, aligned to the top start
        IconButton(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 15.dp, start = 20.dp)
                .size(30.dp),
            onClick = {
                // Toggle the orientation directly based on the requested orientation
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
                        // Default to portrait if no specific orientation is set
                        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    }
                }
            },
        ) {
            Icon(Icons.Filled.ScreenRotation, contentDescription = "Flip Screen")
        }

        // Main content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (!isSelfServiceMode) {
                TerminalConfig(viewModel = terminalConfigViewModel)
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (isSelfServiceMode) {
                SelfServiceLanding(
                    onCheckBalance = { navigateToHook(RootNavDests.status) },
                    onTopUp = { navigateToHook(RootNavDests.topup) },
                    modifier = Modifier.weight(1f)
                )
            } else {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.Bottom,
                ) {
                    if (startpageItems.isNotEmpty()) {
                        Divider()
                    }

                    val scrollState = rememberScrollState()
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(scrollState)
                    ) {
                        startpageItems.forEach { item ->
                            if (loginState.checkAccess(item.canAccess)) {
                                StartpageEntry(item = item, navigateTo = navigateToHook)
                            }
                        }
                    }

                    Divider()

                    if (loginState.hasConfig()) {
                        StartpageEntry(
                            item = StartpageItem(
                                icon = Icons.Filled.Person,
                                navDestination = RootNavDests.user,
                                label = R.string.user_title,
                            ),
                            navigateTo = navigateToHook
                        )
                    }

                    if (loginState.checkAccess { u, _ -> Access.canChangeConfig(u) } || !loginState.hasConfig()) {
                        StartpageEntry(
                            item = StartpageItem(
                                icon = Icons.Filled.Settings,
                                label = R.string.root_item_settings,
                                navDestination = RootNavDests.settings,
                            ),
                            navigateTo = navigateToHook
                        )
                    }

                    if (loginState.checkAccess { u, _ -> Access.canHackTheSystem(u) }) {
                        StartpageEntry(
                            item = StartpageItem(
                                icon = Icons.Filled.DeveloperMode,
                                label = R.string.root_item_development,
                                navDestination = RootNavDests.development,
                            ),
                            navigateTo = navigateToHook
                        )
                    }

                    StartpageEntry(
                        item = StartpageItem(
                            icon = Icons.Filled.Refresh,
                            label = R.string.root_item_restart_app,
                            navDestination = RootNavDests.startpage,
                        ),
                        navigateTo = {
                            restartApp(activity)
                        }
                    )
                }
            }
        }

        if (isSelfServiceMode) {
            IconButton(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp)
                    .size(36.dp),
                onClick = { showInfoDialog = true }
            ) {
                Icon(Icons.Filled.Info, contentDescription = "Terminal info")
            }
        }

        if (isSelfServiceMode && showInfoDialog) {
            Dialog(onDismissRequest = { showInfoDialog = false }) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colors.surface,
                    elevation = 8.dp,
                ) {
                    Column(
                        modifier = Modifier
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

@Composable
private fun SelfServiceLanding(
    onCheckBalance: () -> Unit,
    onTopUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = stringResource(R.string.selfservice_title),
            style = MaterialTheme.typography.h4,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.selfservice_description),
            style = MaterialTheme.typography.body1,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))

        SelfServiceActionCard(
            icon = Icons.Outlined.AccountBalanceWallet,
            title = stringResource(R.string.selfservice_check_balance),
            description = stringResource(R.string.selfservice_check_balance_hint),
            accent = MaterialTheme.colors.primary,
            onClick = onCheckBalance
        )

        Spacer(modifier = Modifier.height(16.dp))

        SelfServiceActionCard(
            icon = Icons.Outlined.AddCircle,
            title = stringResource(R.string.selfservice_topup),
            description = stringResource(R.string.selfservice_topup_hint),
            accent = MaterialTheme.colors.secondary,
            onClick = onTopUp
        )

        Spacer(modifier = Modifier.height(24.dp))

        HintRow(
            text = stringResource(R.string.selfservice_hint_scan),
            icon = Icons.Outlined.Info
        )
        Spacer(modifier = Modifier.height(8.dp))
        HintRow(
            text = stringResource(R.string.selfservice_hint_payment),
            icon = Icons.Outlined.Info
        )
    }
}

@Composable
private fun SelfServiceActionCard(
    icon: ImageVector,
    title: String,
    description: String,
    accent: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(110.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        elevation = 8.dp,
        backgroundColor = MaterialTheme.colors.surface,
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(accent.copy(alpha = 0.15f), shape = RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = accent,
                    modifier = Modifier.size(32.dp)
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.h6)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.body2,
                    color = MaterialTheme.colors.onSurface.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
private fun HintRow(
    text: String,
    icon: ImageVector,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colors.onSurface.copy(alpha = 0.7f)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.body2,
            color = MaterialTheme.colors.onSurface.copy(alpha = 0.7f)
        )
    }
}
