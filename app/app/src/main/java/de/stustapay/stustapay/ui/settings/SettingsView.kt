package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.root.TerminalConfigViewModel


object SettingsNavDest {
    val root = NavDest("root")
    val connection = NavDest("connection")
    val display = NavDest("display")
    val ecreader = NavDest("ecreader")
    val about = NavDest("about")
}


@Composable
fun SettingsRootView(
    navController: NavHostController,
    navigateBack: () -> Unit,
    onOpenUserManagement: () -> Unit,
    terminalConfigViewModel: TerminalConfigViewModel = hiltViewModel(),
) {
    val loginState = terminalConfigViewModel.uiState.collectAsStateWithLifecycle()

    OperatorScaffold(
        title = stringResource(R.string.root_item_settings),
        subtitle = stringResource(R.string.settings_subtitle),
        icon = Icons.Filled.Edit,
        iconPainter = painterResource(id = R.drawable.tfpay_logo_mark),
        terminalLabel = stringResource(R.string.settings_terminal_label),
        footerHint = stringResource(R.string.settings_footer_hint),
        footerSection = stringResource(R.string.settings_footer_section),
        footerStatus = stringResource(R.string.settings_footer_status),
        showFooter = false,
        onBack = navigateBack,
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val compactLayout = maxWidth < 760.dp

            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                if (compactLayout) {
                    OperatorActionCard(
                        title = stringResource(R.string.settings_core_connection),
                        description = stringResource(R.string.settings_core_connection_desc),
                        icon = Icons.Filled.Link,
                        onClick = { navController.navigate(SettingsNavDest.connection.route) },
                        modifier = Modifier.fillMaxWidth(),
                        emphasized = true,
                    )
                    OperatorActionCard(
                        title = stringResource(R.string.settings_ec_reader),
                        description = stringResource(R.string.settings_ec_reader_desc),
                        icon = Icons.Filled.ShoppingCart,
                        onClick = { navController.navigate(SettingsNavDest.ecreader.route) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (loginState.value.isSelfServiceTerminal()) {
                        OperatorActionCard(
                            title = stringResource(R.string.settings_selfservice_display),
                            description = stringResource(R.string.settings_selfservice_display_desc),
                            icon = Icons.Filled.WbSunny,
                            onClick = { navController.navigate(SettingsNavDest.display.route) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(IntrinsicSize.Min),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        OperatorActionCard(
                            title = stringResource(R.string.settings_core_connection),
                            description = stringResource(R.string.settings_core_connection_desc),
                            icon = Icons.Filled.Link,
                            onClick = { navController.navigate(SettingsNavDest.connection.route) },
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                            emphasized = true,
                        )
                        OperatorActionCard(
                            title = stringResource(R.string.settings_ec_reader),
                            description = stringResource(R.string.settings_ec_reader_desc),
                            icon = Icons.Filled.ShoppingCart,
                            onClick = { navController.navigate(SettingsNavDest.ecreader.route) },
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                        )
                    }
                    if (loginState.value.isSelfServiceTerminal()) {
                        OperatorActionCard(
                            title = stringResource(R.string.settings_selfservice_display),
                            description = stringResource(R.string.settings_selfservice_display_desc),
                            icon = Icons.Filled.WbSunny,
                            onClick = { navController.navigate(SettingsNavDest.display.route) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                OperatorActionCard(
                    title = stringResource(R.string.user_title),
                    description = stringResource(R.string.operator_user_desc),
                    icon = Icons.Filled.Person,
                    onClick = onOpenUserManagement,
                    modifier = Modifier.fillMaxWidth(),
                )

                OperatorActionCard(
                    title = stringResource(R.string.settings_about_app),
                    description = stringResource(R.string.settings_about_app_desc),
                    icon = Icons.Filled.Info,
                    onClick = { navController.navigate(SettingsNavDest.about.route) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}


@Preview
@Composable
fun SettingsView(
    leaveView: () -> Unit = {},
    onOpenUserManagement: () -> Unit = {},
) {
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
                onOpenUserManagement = onOpenUserManagement,
            )
        }
        composable(SettingsNavDest.connection.route) {
            RegistrationView(navigateBack = { navController.popBackStack() })
        }
        composable(SettingsNavDest.ecreader.route) {
            ECSettingsView(navigateBack = { navController.popBackStack() })
        }
        composable(SettingsNavDest.display.route) {
            SelfServiceDisplaySettingsView(navigateBack = { navController.popBackStack() })
        }
        composable(SettingsNavDest.about.route) {
            AboutView(navigateBack = { navController.popBackStack() })
        }
    }
}
