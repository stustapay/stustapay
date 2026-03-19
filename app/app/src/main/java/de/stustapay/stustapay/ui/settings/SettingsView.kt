package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.nav.NavDest


object SettingsNavDest {
    val root = NavDest("root")
    val connection = NavDest("connection")
    val ecreader = NavDest("ecreader")
    val about = NavDest("about")
}


@Composable
fun SettingsRootView(
    navController: NavHostController,
    navigateBack: () -> Unit,
) {
    OperatorScaffold(
        title = "Settings",
        subtitle = "Terminal configuration entry point with connection, reader, and about routes.",
        icon = Icons.Filled.Settings,
        terminalLabel = "Local Config",
        footerHint = "This screen routes into server registration, EC reader maintenance, and app information.",
        footerSection = "Config",
        footerStatus = "3 routes",
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OperatorActionCard(
                    title = "Core Connection",
                    description = "Register or deregister the terminal and update the backend endpoint association.",
                    icon = Icons.Filled.Link,
                    onClick = { navController.navigate(SettingsNavDest.connection.route) },
                    modifier = Modifier.weight(1f),
                    emphasized = true,
                )
                OperatorActionCard(
                    title = "EC Card Reader",
                    description = "Open the SumUp maintenance and login settings route.",
                    icon = Icons.Filled.ShoppingCart,
                    onClick = { navController.navigate(SettingsNavDest.ecreader.route) },
                    modifier = Modifier.weight(1f),
                )
            }
            OperatorActionCard(
                title = "About this App",
                description = "Inspect version name and build code information for this installation.",
                icon = Icons.Filled.Info,
                onClick = { navController.navigate(SettingsNavDest.about.route) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}


@Preview
@Composable
fun SettingsView(leaveView: () -> Unit = {}) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = SettingsNavDest.root.route,
        modifier = Modifier.fillMaxSize(),
    ) {
        composable(SettingsNavDest.root.route) {
            SettingsRootView(
                navController = navController,
                navigateBack = leaveView,
            )
        }
        composable(SettingsNavDest.connection.route) {
            RegistrationView(navigateBack = { navController.popBackStack() })
        }
        composable(SettingsNavDest.ecreader.route) {
            ECSettingsView(navigateBack = { navController.popBackStack() })
        }
        composable(SettingsNavDest.about.route) {
            AboutView(navigateBack = { navController.popBackStack() })
        }
    }
}
