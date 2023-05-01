package de.stustanet.stustapay.ui.topup

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

@Composable
fun TopUpCashConfirm(
    goBack: () -> Unit,
    viewModel: DepositViewModel
) {
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    val haptic = LocalHapticFeedback.current
    val scanState = rememberNfcScanDialogState()
    val scope = rememberCoroutineScope()

    NfcScanDialog(scanState, onScan = {
        scope.launch {
            scanState.close()
            viewModel.topUpWithCash(it)
        }
    })

    Scaffold(
        content = { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("%.2f€".format(topUpState.currentAmount.toFloat() / 100), fontSize = 48.sp)
                    Text("received?", fontSize = 48.sp)
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
                Text(status, fontSize = 32.sp)

                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    Button(
                        colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red),
                        onClick = {
                            goBack()
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        },
                        modifier = Modifier
                            .fillMaxWidth(0.5f)
                            .height(70.dp)
                            .padding(end = 10.dp)
                    ) {
                        Text(text = "Back", fontSize = 24.sp)
                    }
                    Button(
                        onClick = {
                            scanState.open()
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