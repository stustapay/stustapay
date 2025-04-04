package de.stustapay.stustapay.ui.root

import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.ui.nav.NavDest


@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel()
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)

    val navigateToHook = fun(dest: NavDest) {
        // only allow navigation if we have a config
        // but always allow entering settings!
        if (!configLoading || dest == RootNavDests.settings) {
            navigateTo(dest)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
    ) {

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TerminalConfig()

            Column(verticalArrangement = Arrangement.Bottom) {

                if (startpageItems.isNotEmpty()) {
                    Divider()
                }

                val scroll = rememberScrollState()
                Column(
                    Modifier
                        .weight(1.0f)
                        .verticalScroll(state = scroll)
                ) {
                    for (item in startpageItems) {
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
                            icon = Icons.AutoMirrored.Filled.Send,
                            label = R.string.root_item_development,
                            navDestination = RootNavDests.development,
                        ),
                        navigateTo = navigateToHook
                    )
                }

                val activity = LocalActivity.current
                StartpageEntry(
                    item = StartpageItem(
                        icon = Icons.Filled.Refresh,
                        label = R.string.root_item_restart_app,
                        navDestination = RootNavDests.startpage,
                    ),
                    navigateTo = {
                        if (activity != null) {
                            restartApp(activity)
                        }
                    }
                )
            }
        }
    }
}