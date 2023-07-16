package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.ui.common.PrefGroup
import de.stustapay.stustapay.ui.common.PrefLink
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.NavScaffold


object SettingsNavDest {
    val root = NavDest("root")
    val connection = NavDest("connection")
    val ecreader = NavDest("ecreader")
    val about = NavDest("about")
}


@Composable
fun SettingsRootView(navController: NavHostController) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
    ) {
        item {
            PrefLink(
                icon = {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings"
                    )
                },
                title = { Text(text = "Core Connection") },
                subtitle = { Text(text = "Server settings") },
            ) {
                navController.navigate(SettingsNavDest.connection.route)
            }
        }
        item {
            PrefLink(
                icon = {
                    Icon(
                        imageVector = Icons.Default.ShoppingCart,
                        contentDescription = "EC Settings"
                    )
                },
                title = { Text(text = "EC Card Reader") },
            ) {
                navController.navigate(SettingsNavDest.ecreader.route)
            }
        }
        item {
            PrefGroup(title = { Text("About") }) {
                PrefLink(
                    icon = { Icon(imageVector = Icons.Default.Info, contentDescription = "About") },
                    title = { Text(text = "About this App") },
                ) {
                    navController.navigate(SettingsNavDest.about.route)
                }
            }
        }
    }
}


@Preview
@Composable
fun SettingsView(leaveView: () -> Unit = {}) {
    val navController = rememberNavController()
    val scaffoldState = rememberScaffoldState()

    NavScaffold(
        title = { Text(text = "Settings") },
        state = scaffoldState,
        navigateBack = {
            if (navController.currentDestination?.route == SettingsNavDest.root.route) {
                leaveView()
            } else {
                navController.popBackStack()
            }
        },
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = SettingsNavDest.root.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
        ) {
            composable(SettingsNavDest.root.route) { SettingsRootView(navController) }
            composable(SettingsNavDest.connection.route) { RegistrationView() }
            composable(SettingsNavDest.ecreader.route) { ECSettingsView() }
            composable(SettingsNavDest.about.route) { AboutView() }
        }
    }
}