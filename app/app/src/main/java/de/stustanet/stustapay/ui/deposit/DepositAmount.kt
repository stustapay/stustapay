package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.DepositKeyboard
import de.stustanet.stustapay.ui.ec.ECButton

@Composable
fun DepositAmount(
    goToCash: () -> Unit,
    viewModel: DepositViewModel
) {

    val depositState by viewModel.depositState.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current

    Scaffold(
        content = { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier.height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "%.2f€".format(depositState.currentAmount.toFloat() / 100),
                        fontSize = 72.sp
                    )
                }
                DepositKeyboard(
                    onDigit = { viewModel.inputDigit(it) },
                    onClear = { viewModel.clear() }
                )
            }
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
                            if (viewModel.checkAmount()) {
                                goToCash()
                            }
                        }
                    ) {
                        // unicode "Coin"
                        Text("\uD83E\uDE99 cash", fontSize = 48.sp)
                    }

                    ECButton(
                        onClickCheck = { viewModel.checkAmount() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        ecPayment = { tag -> viewModel.getECPayment(tag) },
                        onECResult = { state -> viewModel.ecFinished(state) },
                    ) {
                        // unicode "Credit Card"
                        Text("\uD83D\uDCB3 card", fontSize = 48.sp)
                    }
                }
            }
        }
    )
}