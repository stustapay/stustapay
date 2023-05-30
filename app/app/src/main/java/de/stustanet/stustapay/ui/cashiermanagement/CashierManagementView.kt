package de.stustanet.stustapay.ui.cashiermanagement

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.R
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
                title = { Text(stringResource(CashierManagementNavDests.Main.title)) },
                navigateBack = {
                    viewModel.idleState()
                    leaveView()
                }
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
                        Text(stringResource(CashierManagementNavDests.Equip.title), fontSize = 24.sp)
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        onClick = { nav.navigateTo(CashierManagementNavDests.Transport.route) }
                    ) {
                        Text(stringResource(CashierManagementNavDests.Transport.title), fontSize = 24.sp)
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        onClick = { nav.navigateTo(CashierManagementNavDests.Vault.route) }
                    ) {
                        Text(stringResource(CashierManagementNavDests.Vault.title), fontSize = 24.sp)
                    }
                }
            }
        }
        composable(CashierManagementNavDests.Equip.route) {
            NavScaffold(
                title = { Text(stringResource(CashierManagementNavDests.Equip.title)) },
                navigateBack = {
                    viewModel.idleState()
                    nav.navigateTo(CashierManagementNavDests.Main.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementEquipView(viewModel = viewModel)
                }
            }
        }
        composable(CashierManagementNavDests.Transport.route) {
            NavScaffold(
                title = { Text(stringResource(CashierManagementNavDests.Transport.title)) },
                navigateBack = {
                    viewModel.idleState()
                    nav.navigateTo(CashierManagementNavDests.Main.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementTransportView(viewModel = viewModel)
                }
            }
        }
        composable(CashierManagementNavDests.Vault.route) {
            NavScaffold(
                title = { Text(stringResource(CashierManagementNavDests.Vault.title)) },
                navigateBack = {
                    viewModel.idleState()
                    nav.navigateTo(CashierManagementNavDests.Main.route)
                }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementVaultView(viewModel = viewModel)
                }
            }
        }
    }
}

enum class CashierManagementNavDests(val route: String, val title: Int) {
    Main("main", R.string.management_title),
    Equip("equip", R.string.management_equip_title),
    Transport("transport", R.string.management_transport_title),
    Vault("vault", R.string.management_vault_title)
}