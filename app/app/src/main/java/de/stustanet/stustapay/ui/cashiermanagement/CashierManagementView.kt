package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
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
fun CashierManagementView(viewModel: CashierManagementViewModel = hiltViewModel()) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = CashierManagementNavDests.Main.route) {
        composable(CashierManagementNavDests.Main.route) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(10.dp)
            ) {
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { nav.navigateTo(CashierManagementNavDests.Equip.route) }
                ) {
                    Text("Equip Cashier", fontSize = 24.sp)
                }
            }
        }
        composable(CashierManagementNavDests.Equip.route) {
            NavScaffold(
                title = { Text("Equip Cashier") },
                navigateBack = { nav.navigateTo(CashierManagementNavDests.Main.route) }) {
                Box(modifier = Modifier.padding(it)) {
                    CashierManagementEquipView(
                        viewModel = viewModel,
                        navigateBack = { nav.navigateTo(CashierManagementNavDests.Main.route) })
                }
            }
        }
    }
}

enum class CashierManagementNavDests(val route: String) {
    Main("main"),
    Equip("equip")
}