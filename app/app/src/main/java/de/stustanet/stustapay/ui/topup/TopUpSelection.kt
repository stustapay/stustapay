package de.stustanet.stustapay.ui.topup

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.priceselect.PriceSelection
import de.stustanet.stustapay.ui.priceselect.rememberPriceSelectionState
import kotlinx.coroutines.launch

@Composable
fun TopUpSelection(
    goToCash: () -> Unit,
    viewModel: DepositViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.topUpConfig.collectAsStateWithLifecycle()

    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    val priceState = rememberPriceSelectionState()

    Scaffold(
        content = { paddingValues ->
            PriceSelection(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp)
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                state = priceState,
                onEnter = { viewModel.setAmount(it) },
                onClear = { viewModel.clearDraft() },
            )
        },
        bottomBar = {
            Column(modifier = Modifier.padding(20.dp)) {
                Divider(modifier = Modifier.fillMaxWidth())
                Text(status, fontSize = 32.sp)

                Row(modifier = Modifier.padding(top = 10.dp)) {
                    // Cash flow
                    Button(
                        modifier = Modifier
                            .fillMaxWidth(0.5f)
                            .padding(end = 10.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            scope.launch {
                                if (viewModel.checkAmountLocal(topUpState.currentAmount.toDouble() / 100)) {
                                    goToCash()
                                }
                            }
                        },
                        enabled = topUpConfig.ready,
                    ) {
                        // unicode "Coin"
                        Text("\uD83E\uDE99 cash", fontSize = 48.sp)
                    }

                    // EC Flow
                    val context = LocalContext.current as Activity
                    val scanState = rememberNfcScanDialogState()
                    NfcScanDialog(
                        state = scanState,
                        onScan = { tag ->
                            scope.launch {
                                viewModel.topUpWithCard(context, tag)
                            }
                        }
                    )

                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 10.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            scanState.open()
                        },
                        enabled = topUpConfig.ready,
                    ) {
                        // unicode "Credit Card"
                        Text("\uD83D\uDCB3 card", fontSize = 48.sp)
                    }
                }
            }
        }
    )
}
