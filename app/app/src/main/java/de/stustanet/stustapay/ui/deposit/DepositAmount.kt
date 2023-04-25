package de.stustanet.stustapay.ui.deposit

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
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
import kotlinx.coroutines.launch

@Composable
fun DepositAmount(
    goToCash: () -> Unit,
    viewModel: DepositViewModel
) {

    val depositState by viewModel.depositState.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    val scanState = rememberNfcScanDialogState()
    val context = LocalContext.current as Activity



    NfcScanDialog(
        state = scanState,
        onScan = { tag ->
            scope.launch {
                if (viewModel.checkAmount(tag)) {
                    val payment = viewModel.getECPayment(tag)
                    viewModel.pay(context, payment)
                }
            }
        }
    )

    Scaffold(
        content = { paddingValues ->
            PriceSelection(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                onEnter = { viewModel.setAmount(it) },
                onClear = { viewModel.clear() },
            )
        },
        bottomBar = {
            Column {
                Text(depositState.status, fontSize = 32.sp)
                Row {
                    Button(
                        modifier = Modifier
                            .fillMaxWidth(0.5f)
                            .padding(20.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            scope.launch {
                                goToCash()
                            }
                        }
                    ) {
                        // unicode "Coin"
                        Text("\uD83E\uDE99 cash", fontSize = 48.sp)
                    }

                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            scanState.open()
                        }
                    ) {
                        // unicode "Credit Card"
                        Text("\uD83D\uDCB3 card", fontSize = 48.sp)
                    }
                }
            }
        }
    )
}
