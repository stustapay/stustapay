package de.stustapay.stustapay.ui.root

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.ui.nav.NavDest

@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel()
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)
    val activity = LocalActivity.current!!

    // Automatically navigate to topup view for users with only the can_topup privilege
    LaunchedEffect(loginState) {
        if (loginState.hasConfig() && !configLoading) {
            if (loginState.hasOnlyTopUpPrivilege()) {
                navigateTo(RootNavDests.topup)
            }
        }
    }

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
            TerminalConfig()

            Spacer(modifier = Modifier.height(16.dp))

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
}
