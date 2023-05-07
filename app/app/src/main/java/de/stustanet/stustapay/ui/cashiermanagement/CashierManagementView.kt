package de.stustanet.stustapay.ui.cashiermanagement

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.nav.navigateTo

@Composable
fun CashierManagementView(
    viewModel: CashierManagementViewModel = hiltViewModel(),
    leaveView: () -> Unit
) {
    val nav = rememberNavController()

    LaunchedEffect(nav) {
        viewModel.getData()
    }

    BackHandler {
        leaveView()
    }

    NavHost(navController = nav, startDestination = CashierManagementNavDests.Main.route) {
        composable(CashierManagementNavDests.Main.route) {
            NavScaffold(
                title = { Text(CashierManagementNavDests.Main.title) },
                navigateBack = leaveView
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp)
                ) {
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        onClick = { nav.navigateTo(CashierManagementNavDests.Equip.route) }
                    ) {
                        Text(CashierManagementNavDests.Equip.title, fontSize = 24.sp)
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        onClick = { nav.navigateTo(CashierManagementNavDests.Transport.route) }
                    ) {
                        Text(CashierManagementNavDests.Transport.title, fontSize = 24.sp)
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        onClick = { nav.navigateTo(CashierManagementNavDests.Vault.route) }
                    ) {
                        Text(CashierManagementNavDests.Vault.title, fontSize = 24.sp)
                    }
                }
            }
        }
        composable(CashierManagementNavDests.Equip.route) {
            NavScaffold(
                title = { Text(CashierManagementNavDests.Equip.title) },
                navigateBack = { nav.navigateTo(CashierManagementNavDests.Main.route) }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementEquipView(viewModel = viewModel)
                }
            }
        }
        composable(CashierManagementNavDests.Transport.route) {
            NavScaffold(
                title = { Text(CashierManagementNavDests.Transport.title) },
                navigateBack = { nav.navigateTo(CashierManagementNavDests.Main.route) }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementTransportView(viewModel = viewModel)
                }
            }
        }
        composable(CashierManagementNavDests.Vault.route) {
            NavScaffold(
                title = { Text(CashierManagementNavDests.Vault.title) },
                navigateBack = { nav.navigateTo(CashierManagementNavDests.Main.route) }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementVaultView(viewModel = viewModel)
                }
            }
        }
    }
}

enum class CashierManagementNavDests(val route: String, val title: String) {
    Main("main", "Cashier Management"),
    Equip("equip", "Equip Cashier"),
    Transport("transport", "Transport"),
    Vault("vault", "Vault")
}