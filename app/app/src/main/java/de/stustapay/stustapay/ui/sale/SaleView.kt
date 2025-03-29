package de.stustapay.stustapay.ui.sale

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.ErrorDialog
import kotlinx.coroutines.launch


/**
 * Displays available purchase items and guides through the whole order.
 */
@Preview
@Composable
fun SaleView(
    leaveView: () -> Unit = {},
    viewModel: SaleViewModel = hiltViewModel()
) {
    val scope = rememberCoroutineScope()
    val nav = rememberNavController()
    val scanState = rememberNfcScanDialogState()

    val navTarget by viewModel.navState.collectAsStateWithLifecycle()
    val error_ by viewModel.error.collectAsStateWithLifecycle()
    val error = error_
    val enableScan by viewModel.enableScan.collectAsStateWithLifecycle()
    val context = LocalActivity.current!!

    LaunchedEffect(navTarget) {
        if (nav.currentDestination?.route != navTarget.route) {
            nav.navigate(navTarget.route)
        }
    }

    LaunchedEffect(enableScan) {
        if (enableScan) {
            scanState.open()
        } else {
            scanState.close()
        }
    }

    NfcScanDialog(
        state = scanState,
        onScan = { uid ->
            scope.launch {
                viewModel.tagScanned(uid)
            }
        },
        onDismiss = {
            viewModel.tagScanDismissed()
        }
    )

    if (error != null) {
        ErrorDialog(onDismiss = { viewModel.errorPopupDismissed() }) {
            Text(text = stringResource(R.string.error), style = MaterialTheme.typography.h3)

            Text(error, style = MaterialTheme.typography.h4)
        }
    }

    BackHandler {
        leaveView()
    }

    NavHost(
        navController = nav,
        startDestination = SalePage.ProductSelect.route
    ) {
        composable(SalePage.ProductSelect.route) {
            SaleSelection(
                viewModel,
                leaveView = leaveView,
            )
        }

        // what would be booked, from there one can get back to edit-mode
        composable(SalePage.Confirm.route) {
            SaleConfirm(
                viewModel,
                onEdit = {
                    scope.launch {
                        viewModel.editOrder()
                    }
                },
                onConfirm = {
                    scope.launch {
                        viewModel.bookSale(context)
                    }
                },
            )
        }

        // the order was booked successfully.
        composable(SalePage.Success.route) {
            SaleSuccess(
                viewModel,
                onConfirm = {
                    scope.launch {
                        viewModel.clearSale(true)
                    }
                }
            )
        }

        // something failed when validating or booking the order
        composable(SalePage.Error.route) {
            SaleError(
                onDismiss = {
                    scope.launch {
                        viewModel.errorPageDismissed()
                    }
                },
                viewModel = viewModel,
            )
        }
    }
}
