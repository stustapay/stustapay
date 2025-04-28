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
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.libssp.ui.theme.MoneyAmountStyle
import kotlinx.coroutines.launch
import javax.inject.Inject


/**
 * To confirm one has received cash.
 * Then requests a tag scan, and returns its result in "onConfirm".
 */
@Composable
fun CashConfirmView(
    goBack: () -> Unit,
    getAmount: () -> UInt,
    status: @Composable () -> Unit = {},
    question: String = stringResource(R.string.received_q),
    onPay: CashECCallback,
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

    // Check if we actually want to pay a tag without having to scan it again
    val scanState = rememberNfcScanDialogState()
    NfcScanDialog(
        state = scanState,
        onDismiss = {
            // Reset customer display when scan dialog is dismissed
            viewModel.resetCustomerDisplay()
        },
        onScan = { tag ->
            // Reset customer display when a tag is scanned
            viewModel.resetCustomerDisplay()
            when (onPay) {
                is CashECCallback.Tag -> {
                    onPay.onCash(tag)
                }

                is CashECCallback.NoTag -> {
                    // never reached.
                    error("nfc scanned in cash NoTag mode")
                }
            }
        }
    )

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
                        text = "%.2f€".format(getAmount().toDouble() / 100),
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
                            when (onPay) {
                                is CashECCallback.Tag -> {
                                    // Update customer display to show scan chip message
                                    viewModel.showScanChipOnCustomerDisplay()
                                    scanState.open()
                                }

                                is CashECCallback.NoTag -> {
                                    onPay.onCash()
                                    goBack()
                                }
                            }
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
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
}