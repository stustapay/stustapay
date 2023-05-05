package de.stustanet.stustapay.ui.common.pay


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
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

/**
 * To confirm one has received cash.
 * Then requests a tag scan, and returns its result in "onConfirm".
 */
@Composable
fun CashConfirmView(
    goBack: () -> Unit,
    getAmount: () -> Double,
    status: String,
    onConfirm: (UserTag) -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val scanState = rememberNfcScanDialogState()
    val scope = rememberCoroutineScope()

    NfcScanDialog(scanState, onScan = {
        scope.launch {
            scanState.close()
            onConfirm(it)
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
                    Text("%.2f€".format(getAmount()), fontSize = 48.sp)
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