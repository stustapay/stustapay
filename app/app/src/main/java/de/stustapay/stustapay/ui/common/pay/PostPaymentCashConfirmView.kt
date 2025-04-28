package de.stustapay.stustapay.ui.common.pay


import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.libssp.ui.theme.MoneyAmountStyle
import kotlinx.coroutines.launch

/**
 * To confirm one has received cash.
 * Then requests a tag scan, and returns its result in "onConfirm".
 */
@Composable
fun PostPaymentCashConfirmView(
    goBack: () -> Unit,
    getAmount: () -> Double,
    status: @Composable () -> Unit = {},
    question: String = stringResource(R.string.received_q),
    onPay: CashECCallback,
    existingTag: NfcTag? = null,
    viewModel: CashECSelectionViewModel = hiltViewModel(),
) {
    val haptic = LocalHapticFeedback.current
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    
    // If the user only has the can_topup privilege, don't show the cash confirmation dialog
    if (config.hasOnlyTopUpPrivilege()) {
        // Navigate back to avoid showing this screen
        LaunchedEffect(Unit) {
            goBack()
        }
        return
    }
    
    val scanState = rememberNfcScanDialogState()
    val scope = rememberCoroutineScope()

    // State to track whether the payment is being processed
    var isProcessing by remember { mutableStateOf(false) }

    Scaffold(
        content = { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "%.2f€".format(getAmount().toDouble()),
                        style = MoneyAmountStyle,
                    )
                    Text(
                        text = question,
                        style = MaterialTheme.typography.h4,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp)
                    .fillMaxWidth()
            ) {
                Divider(modifier = Modifier.fillMaxWidth())
                status()

                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    Button(
                        colors = ButtonDefaults.buttonColors(backgroundColor = MaterialTheme.colors.error),
                        onClick = {
                            goBack()
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        },
                        modifier = Modifier
                            .fillMaxWidth(0.5f)
                            .height(70.dp)
                            .padding(end = 10.dp)
                    ) {
                        Text(text = stringResource(R.string.back), fontSize = 24.sp)
                    }
                    Button(
                        onClick = {
                            if (!isProcessing) {
                                isProcessing = true
                                if (existingTag != null) {
                                    // Process payment using the existing tag
                                    scope.launch {
                                        when (onPay) {
                                            is CashECCallback.Tag -> {
                                                onPay.onCash(existingTag)
                                            }
                                            is CashECCallback.NoTag -> {
                                                // This shouldn't be reached
                                                error("Unexpected NoTag callback with existingTag.")
                                            }
                                        }
                                        goBack()
                                    }
                                } else {
                                    // Open NFC scan dialog
                                    viewModel.showScanChipOnCustomerDisplay()
                                    scanState.open()
                                }
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(70.dp)
                            .padding(start = 10.dp)
                    ) {
                        Text(text = "✓", fontSize = 24.sp)
                    }
                }
            }
        }
    )

    // NFC scan dialog for cases without an existing tag
    if (existingTag == null) {
        NfcScanDialog(
            state = scanState, 
            onDismiss = {
                // Reset customer display when scan dialog is dismissed
                viewModel.resetCustomerDisplay()
            },
            onScan = { tag ->
                // Reset customer display when tag is scanned
                viewModel.resetCustomerDisplay()
                scope.launch {
                    scanState.close()
                    when (onPay) {
                        is CashECCallback.Tag -> {
                            onPay.onCash(tag)
                            goBack()
                        }
                        is CashECCallback.NoTag -> {
                            // This shouldn't be reached
                            error("Unexpected NoTag callback during NFC scan.")
                        }
                    }
                }
            }
        )
    }
}
