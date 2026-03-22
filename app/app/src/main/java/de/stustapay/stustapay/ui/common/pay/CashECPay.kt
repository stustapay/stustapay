package de.stustapay.stustapay.ui.common.pay

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.CircularProgressIndicator
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
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
    interactionBlocked: Boolean = false,
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
                interactionBlocked = interactionBlocked,
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
    interactionBlocked: Boolean,
    checkAmount: () -> Boolean,
    viewModel: CashECSelectionViewModel = hiltViewModel(),
    status: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()
    val blockInteractions = interactionBlocked || scanState.isOpen()
    val overlayInteractionSource = remember { MutableInteractionSource() }
    val isSelfService = config.hasOnlyTopUpPrivilege()

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            backgroundColor = if (isSelfService) {
                Color.Transparent
            } else {
                MaterialTheme.colors.background
            },
            content = content,
            bottomBar = {
                Column(
                    modifier = if (isSelfService) {
                        Modifier
                            .fillMaxWidth()
                            .background(SelfServicePalette.backgroundBottom)
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    } else {
                        Modifier
                            .padding(horizontal = 10.dp)
                            .padding(bottom = 5.dp)
                    }
                ) {
                    if (!isSelfService) {
                        Divider(modifier = Modifier.fillMaxWidth())
                    }
                    status()

                    Row(modifier = Modifier.padding(top = 5.dp)) {
                        // Cash flow
                        // Hide the Cash button for users with only the can_topup privilege
                        if (!isSelfService) {
                            Button(
                                modifier = Modifier
                                    .fillMaxWidth(0.5f)
                                    .padding(end = 10.dp),
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    goToCash()
                                },
                                enabled = ready && config.canHandleCash() && !blockInteractions,
                            ) {
                                Text(
                                    stringResource(R.string.pay_cash),
                                    textAlign = TextAlign.Center,
                                    style = LargeButtonStyle,
                                )
                            }
                        }

                        Button(
                            modifier = if (config.hasOnlyTopUpPrivilege()) {
                                Modifier
                                    .fillMaxWidth()
                                    .height(58.dp)
                                    .padding(vertical = 2.dp)
                            } else {
                                Modifier
                                    .fillMaxWidth()
                                    .padding(start = 10.dp)
                            },
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                if (checkAmount()) {
                                    when (onPayRequested) {
                                        is CashECCallback.Tag -> {
                                            viewModel.showScanChipOnCustomerDisplay()
                                            scanState.open()
                                        }

                                        is CashECCallback.NoTag -> {
                                            onPayRequested.onEC()
                                        }
                                    }
                                }
                            },
                            enabled = ready && !blockInteractions,
                            colors = if (config.hasOnlyTopUpPrivilege()) {
                                ButtonDefaults.buttonColors(
                                    backgroundColor = SelfServicePalette.accent,
                                    contentColor = SelfServicePalette.backgroundTop,
                                    disabledBackgroundColor = SelfServicePalette.panelBorder,
                                    disabledContentColor = SelfServicePalette.subtitle
                                )
                            } else {
                                ButtonDefaults.buttonColors()
                            }
                        ) {
                            Text(
                                if (config.hasOnlyTopUpPrivilege()) {
                                    stringResource(R.string.selfservice_scan_pay)
                                } else {
                                    stringResource(R.string.pay_card)
                                },
                                textAlign = TextAlign.Center,
                                style = LargeButtonStyle,
                                color = if (config.hasOnlyTopUpPrivilege()) {
                                    SelfServicePalette.backgroundTop
                                } else {
                                    Color.Unspecified
                                }
                            )
                        }
                    }
                }
            }
        )

        NfcScanDialog(
            state = scanState,
            showClarification = config.hasOnlyTopUpPrivilege(),
            onDismiss = {
                viewModel.resetCustomerDisplay()
            },
            onScan = { tag ->
                viewModel.resetCustomerDisplay()
                when (onPayRequested) {
                    is CashECCallback.Tag -> {
                        onPayRequested.onEC(tag)
                    }

                    is CashECCallback.NoTag -> {
                        error("nfc scanned in ec NoTag mode")
                    }
                }
            }
        )

        if (blockInteractions) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colors.onSurface.copy(alpha = 0.22f))
                    .clickable(
                        interactionSource = overlayInteractionSource,
                        indication = null
                    ) { },
                contentAlignment = Alignment.Center
            ) {
                OperatorPanel(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    backgroundColor = OperatorPalette.panel,
                    borderColor = OperatorPalette.panelBorder,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(22.dp))
                        Text(
                            text = stringResource(R.string.common_status_fetching),
                            style = MaterialTheme.typography.subtitle1,
                            color = OperatorPalette.title,
                        )
                    }
                }
            }
        }
    }
}
