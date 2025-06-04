package de.stustapay.stustapay.ui.common.pay


import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.libssp.ui.theme.LargeButtonStyle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.nav.navigateTo

enum class CashECPage(val route: String) {
    Selection("selection"),
    CashConfirm("cash_confirm"),
}

/**
 * if we want to pay something either by cash or by credit card.
 */
@Composable
fun CashECPay(
    modifier: Modifier = Modifier,
    onPaymentRequested: CashECCallback,
    checkAmount: () -> Boolean = { true },
    ready: Boolean,
    getAmount: () -> UInt,
    status: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    val nav = rememberNavController()

    NavHost(
        modifier = modifier,
        navController = nav,
        startDestination = CashECPage.Selection.route,
    ) {
        composable(CashECPage.Selection.route) {
            CashECSelection(
                goToCash = {
                    if (checkAmount()) {
                        nav.navigateTo(CashECPage.CashConfirm.route)
                    }
                },
                onPayRequested = onPaymentRequested,
                ready = ready,
                status = status,
                checkAmount = checkAmount,
                content = content,
            )
        }
        composable(CashECPage.CashConfirm.route) {
            CashConfirmView(
                goBack = { nav.navigateTo(CashECPage.Selection.route) },
                getAmount = getAmount,
                status = status,
                onPay = onPaymentRequested,
            )
        }
    }
}

/**
 * Container for payment selections.
 * Has Cash/EC button in the bottom bar.
 */
@Composable
fun CashECSelection(
    goToCash: () -> Unit,
    onPayRequested: CashECCallback,
    ready: Boolean,
    checkAmount: () -> Boolean,
    viewModel: CashECSelectionViewModel = hiltViewModel(),
    status: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    Scaffold(
        content = content,
        bottomBar = {
            Column(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp)
            ) {
                Divider(modifier = Modifier.fillMaxWidth())
                status()

                Row(modifier = Modifier.padding(top = 5.dp)) {
                    // Cash flow
                    // Hide the Cash button for users with only the can_topup privilege
                    if (!config.hasOnlyTopUpPrivilege()) {
                        Button(
                            modifier = Modifier
                                .fillMaxWidth(0.5f)
                                .padding(end = 10.dp),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                goToCash()
                            },
                            enabled = ready && config.canHandleCash(),
                        ) {
                            // unicode "Coin"
                            Text(
                                stringResource(R.string.pay_cash),
                                textAlign = TextAlign.Center,
                                style = LargeButtonStyle,
                            )
                        }
                    }

                    // EC Flow
                    val scanState = rememberNfcScanDialogState()
                    NfcScanDialog(
                        state = scanState,
                        showClarification = config.hasOnlyTopUpPrivilege(),
                        onDismiss = {
                            // Reset customer display when scan dialog is dismissed
                            viewModel.resetCustomerDisplay()
                        },
                        onScan = { tag ->
                            // Reset customer display when a tag is scanned
                            viewModel.resetCustomerDisplay()
                            when (onPayRequested) {
                                is CashECCallback.Tag -> {
                                    onPayRequested.onEC(tag)
                                }

                                is CashECCallback.NoTag -> {
                                    // never reached.
                                    error("nfc scanned in ec NoTag mode")
                                }
                            }
                        }
                    )

                    Button(
                        modifier = if (config.hasOnlyTopUpPrivilege()) {
                            // If the user only has the can_topup privilege, make the Card button take the full width
                            Modifier
                                .fillMaxWidth()
                        } else {
                            // Otherwise, take half the width with padding on the left
                            Modifier
                                .fillMaxWidth()
                                .padding(start = 10.dp)
                        },
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            if (checkAmount()) {
                                when (onPayRequested) {
                                    is CashECCallback.Tag -> {
                                        // Update customer display to show scan chip message
                                        viewModel.showScanChipOnCustomerDisplay()
                                        scanState.open()
                                    }

                                    is CashECCallback.NoTag -> {
                                        onPayRequested.onEC()
                                    }
                                }
                            }
                        },
                        enabled = ready,
                    ) {
                        // Use different text for self-service top-up users
                        Text(
                            if (config.hasOnlyTopUpPrivilege()) {
                                stringResource(R.string.pay_card_topup)
                            } else {
                                stringResource(R.string.pay_card)
                            },
                            textAlign = TextAlign.Center,
                            style = LargeButtonStyle,
                        )
                    }
                }
            }
        }
    )
}
