package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

@Composable
fun DepositCash(
    goBack: () -> Unit,
    viewModel: DepositViewModel
) {
    val depositState by viewModel.depositState.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current
    val scanState = rememberNfcScanDialogState()
    val scope = rememberCoroutineScope()

    NfcScanDialog(scanState, onScan = {
        scope.launch{
            viewModel.cashFinished(it)
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
                    Text("%.2f€".format(depositState.currentAmount.toFloat() / 100), fontSize = 48.sp)
                    Text("received?", fontSize = 48.sp)
                }
            }
        },
        bottomBar = {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        goBack()
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                    modifier = Modifier
                        .fillMaxWidth(0.5f)
                        .height(70.dp)
                        .padding(10.dp)
                ) {
                    Text(text = "Back")
                }
                Button(
                    onClick = {
                        scanState.open()
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp)
                        .padding(10.dp)
                ) {
                    Text(text = "✓")
                }
            }
        }
    )
}