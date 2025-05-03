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
    isSmallScreen: Boolean = false
) {
    val scanState = rememberNfcScanDialogState()
    val haptic = LocalHapticFeedback.current

    // Adjust sizes based on screen size
    val questionFontSize = if (isSmallScreen) 18.sp else 22.sp
    val amountFontSize = if (isSmallScreen) 28.sp else 36.sp
    val statusVerticalPadding = if (isSmallScreen) 6.dp else 12.dp
    val buttonHeight = if (isSmallScreen) 50.dp else 70.dp
    val buttonTextSize = if (isSmallScreen) 18.sp else 24.sp
    val buttonPadding = if (isSmallScreen) 6.dp else 10.dp
    val dividerVerticalPadding = if (isSmallScreen) 4.dp else 8.dp

    // use our helper here to get a tag
    when (onPay) {
        is CashECCallback.Tag -> {
            NfcScanDialog(
                state = scanState,
                onScan = {
                    onPay.onCash(it)
                }
            )
        }

        else -> {}
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    question,
                    modifier = Modifier.padding(
                        start = 10.dp, 
                        end = 10.dp, 
                        top = if (isSmallScreen) 6.dp else 10.dp
                    ),
                    fontSize = questionFontSize,
                    textAlign = TextAlign.Center,
                )

                // Convert cents to euros by dividing by 100
                Text(
                    "%.2f €".format(getAmount().toDouble() / 100),
                    style = MoneyAmountStyle,
                    fontSize = amountFontSize
                )

                Box(
                    modifier = Modifier
                        .padding(vertical = statusVerticalPadding)
                        .fillMaxWidth()
                ) {
                    status()
                }
            }
        },
        bottomBar = {
            Column(modifier = Modifier.padding(bottom = if (isSmallScreen) 4.dp else 10.dp)) {
                Divider(
                    modifier = Modifier.padding(vertical = dividerVerticalPadding)
                )

                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Button(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            goBack()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(buttonHeight)
                            .padding(end = buttonPadding)
                            .weight(1f),
                        colors = ButtonDefaults.buttonColors(backgroundColor = MaterialTheme.colors.secondary),
                    ) {
                        Text(text = "✕", fontSize = buttonTextSize)
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
                            .height(buttonHeight)
                            .padding(start = buttonPadding)
                            .weight(1f)
                    ) {
                        Text(text = "✓", fontSize = buttonTextSize)
                    }
                }
            }
        }
    ) {
        Box(
            modifier = Modifier
                .padding(it)
                .fillMaxSize()
        ) {}
    }
}