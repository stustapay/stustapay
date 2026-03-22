package de.stustapay.stustapay.ui.sale

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.NfcScanDialogVariant
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.FailureIcon
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
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
        variant = NfcScanDialogVariant.Sale,
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
        SaleErrorDialog(
            message = error,
            onDismiss = { viewModel.errorPopupDismissed() }
        )
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

@Composable
private fun SaleErrorDialog(
    message: String,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        OperatorPanel(
            modifier = androidx.compose.ui.Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
            backgroundColor = OperatorPalette.panel,
            borderColor = OperatorPalette.danger,
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                FailureIcon()
                Text(
                    text = stringResource(R.string.error),
                    color = OperatorPalette.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = message,
                    color = OperatorPalette.subtitle,
                    fontSize = 18.sp,
                    lineHeight = 24.sp,
                    fontWeight = FontWeight.Medium,
                )
                OperatorPrimaryButton(
                    text = stringResource(R.string.back),
                    icon = Icons.Filled.ErrorOutline,
                    onClick = onDismiss,
                )
            }
        }
    }
}
