package de.stustanet.stustapay.ui.order

import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.chipscan.ChipScanView
import de.stustanet.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch


/**
 * Displays available purchase items and guides through the whole order.
 */
@Preview
@Composable
fun OrderView(viewModel: OrderViewModel = hiltViewModel()) {
    val scope = rememberCoroutineScope()
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = "main") {
        composable("main") {
            ChipScanView(onScan = { uid ->
                nav.navigateTo("success")
                // TODO: store uid in order progress
            }) { chipScanState ->
                OrderSelection(
                    viewModel,
                    onAbort = {
                        viewModel.clearOrder()
                    },
                    onSubmit = {
                        scope.launch {
                            Log.i("stustapay", "submit order")
                            viewModel.submitOrder()
                            //chipScanState.scan("--total cost--€\nScan a chip")
                        }
                    },
                    fetch = {
                        scope.launch {
                            viewModel.fetchConfig()
                        }
                    }
                )
            }
        }
        composable("success") {
            OrderSuccess(
                viewModel,
                onDismiss = {
                    viewModel.clearOrder()
                    nav.navigateTo("main")
                }
            )
        }

        composable("failure") {
            OrderFailure(onDismiss = {
                viewModel.clearOrder()
                nav.navigateTo("main")
            })
        }
    }
}
