package de.stustanet.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.amountselect.AmountSelection
import de.stustanet.stustapay.ui.common.rememberDialogDisplayState
import kotlinx.coroutines.launch


@Composable
fun PayOutView(
    viewModel: PayOutViewModel = hiltViewModel(),
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val payOutState by viewModel.payOutState.collectAsStateWithLifecycle()
    val showPayOutConfirm by viewModel.showPayOutConfirm.collectAsStateWithLifecycle()
    val completedPayOut by viewModel.completedPayOut.collectAsStateWithLifecycle()
    val enableScan by viewModel.tagScanStatus.collectAsStateWithLifecycle()

    val haptic = LocalHapticFeedback.current

    LaunchedEffect(Unit) {
        viewModel.fetchConfig()
    }

    val scope = rememberCoroutineScope()

    val confirmState = rememberDialogDisplayState()
    LaunchedEffect(showPayOutConfirm) {
        if (enableScan) {
            confirmState.open()
        } else {
            confirmState.close()
        }
    }

    PayOutConfirmDialog(
        state = confirmState,
        onConfirm = { scope.launch { viewModel.confirmPayOut() } },
        onAbort = { viewModel.dismissPayOutConfirm() },
        getAmount = { payOutState.getAmount() },
        status = { Text(status) }
    )

    val scanState = rememberNfcScanDialogState()
    LaunchedEffect(enableScan) {
        if (enableScan) {
            scanState.open()
        } else {
            scanState.close()
        }
    }

    NfcScanDialog(
        state = scanState,
        onScan = { tag ->
            scope.launch {
                viewModel.tagScanned(tag)
            }
        },
        onDismiss = {
            viewModel.tagScanCancelled()
        }
    )

    val completedPayOutV = completedPayOut
    if (completedPayOutV != null) {
        PayOutSuccessDialog(
            onDismiss = {
                viewModel.dismissPayOutSuccess()
            },
            completedPayOut = completedPayOutV
        )
    }

    Scaffold(
        bottomBar = {
            Column(modifier = Modifier.padding(20.dp)) {
                Divider(modifier = Modifier.fillMaxWidth())
                Text(status, fontSize = 24.sp)

                Row(
                    modifier = Modifier
                        .padding(top = 10.dp)
                        .fillMaxWidth()
                ) {
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(end = 10.dp),
                        onClick = {
                            scope.launch {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.requestPayOut()
                            }
                        },
                        enabled = config.hasConfig(),
                    ) {
                        Text(
                            // unicode "Coin"
                            "\uD83E\uDE99 Auszahlen...", fontSize = 30.sp,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .padding(horizontal = 10.dp)
        ) {
            val currentCustomer = payOutState.checkedPayOut
            if (currentCustomer == null) {
                // money with wings
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "\uD83D\uDCB8",
                        fontSize = 100.sp,
                        textAlign = TextAlign.Center,
                    )
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text("Tag ID: ${currentCustomer.tag}", fontSize = 24.sp)
                    IconButton(onClick = { viewModel.clearDraft() }) {
                        Icon(Icons.Filled.Clear, "Clear PayOut")
                    }
                }
                Text("Guthaben: %.2€".format(currentCustomer.maxAmount.toDouble() / 100.0))

                AmountSelection(
                    amount = payOutState.getAmount(),
                    onAmountUpdate = { viewModel.setAmount(it) },
                    onClear = { viewModel.clearAmount() },
                    config = AmountConfig.Money(
                        limit = payOutState.getMaxAmount(),
                        cents = false,
                    )
                )
            }
        }
    }
}
