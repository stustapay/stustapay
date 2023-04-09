package de.stustanet.stustapay.ui.deposit

import androidx.compose.runtime.*
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.navigateTo

@Preview
@Composable
fun DepositView(viewModel: DepositViewModel = hiltViewModel()) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = "main") {
        composable("main") {
            DepositMain(
                goToMethod = { nav.navigateTo("method") },
                viewModel
            )
        }
        composable("method") {
            DepositMethod(
                goToMain = { nav.navigateTo("main") },
                goToCash = { nav.navigateTo("cash") },
                goToCard = { nav.navigateTo("card") },
                viewModel
            )
        }
        composable("cash") {
            DepositCash(
                goToMethod = { nav.navigateTo("method") },
                goToSuccess = { nav.navigateTo("success") },
                goToFailure = { nav.navigateTo("failure") },
                viewModel
            )
        }
        composable("card") {
            DepositCard(
                goToMethod = { nav.navigateTo("method") },
                goToSuccess = { nav.navigateTo("success") },
                goToFailure = { nav.navigateTo("failure") },
                viewModel
            )
        }
        composable("paymentselect"){
            ChipScanView(onScan = { uid ->
                // TODO: Connect to DB
                if (amount < 10) {
                    nav.navigate("success") { launchSingleTop = true }
                } else {
                    nav.navigate("failure") { launchSingleTop = true }
                }
            }) { chipScanState ->
                Scaffold(
                    content= {paddingValues ->
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(bottom = paddingValues.calculateBottomPadding()),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Button(
                                onClick = {
                                    scope.launch {
                                            chipScanState.scan("$amount€\nScan a chip")
                                        }
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(70.dp)
                                    .padding(10.dp)
                            ) {
                                Text(text = "Cash")
                            }
                            ECView(BigDecimal(amount.toString()))
                        }
                    }
                )
            }
        }
        composable("success") {
            DepositSuccess(
                goToMain = { nav.navigateTo("main") },
                viewModel
            )
        }
        composable("failure") {
            DepositFailure(
                goToMain = { nav.navigateTo("main") },
                viewModel
            )
        }
    }
}
