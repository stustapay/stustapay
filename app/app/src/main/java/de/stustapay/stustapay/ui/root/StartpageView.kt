package de.stustapay.stustapay.ui.root

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.libssp.ui.common.Spinner
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.ui.nav.NavDest
import kotlinx.coroutines.launch

@Preview
@Composable
fun PreviewStartpageView() {
    StartpageView(viewModel = hiltViewModel())
}


@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel()
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)
    val scope = rememberCoroutineScope()
    val activity = LocalContext.current as Activity

    val navigateToHook = fun(dest: NavDest): Unit {
        // only allow navigation if we have a config
        // but always allow entering settings!
        if (!configLoading || dest == RootNavDests.settings) {
            navigateTo(dest)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.fetchAccessData()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
    ) {
        IconButton(
            modifier = Modifier
                .align(alignment = Alignment.TopEnd)
                .padding(top = 15.dp, end = 20.dp)
                .size(30.dp),
            onClick = {
                scope.launch {
                    viewModel.fetchAccessData()
                }
            },
            enabled = !configLoading,
        ) {
            if (configLoading) {
                Spinner()
            } else {
                Icon(Icons.Filled.Refresh, "Refresh")
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val title = loginState.title()
            Text(
                text = title.title,
                fontSize = 30.sp,
                modifier = Modifier.padding(top = 10.dp)
            )
            if (title.subtitle != null) {
                Text(
                    text = title.subtitle,
                    fontSize = 24.sp,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }

            LoginProfile(viewModel)

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
                            icon = Icons.Filled.Send,
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