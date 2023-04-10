package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState

@Composable
fun DepositCard(
    goToMethod: () -> Unit,
    goToSuccess: () -> Unit,
    goToFailure: () -> Unit,
    viewModel: DepositViewModel
) {
    val depositState by viewModel.depositState.collectAsStateWithLifecycle()

    val haptic = LocalHapticFeedback.current
    val scanState = rememberNfcScanDialogState()

    LaunchedEffect(scanState) {
        scanState.open()
    }

    NfcScanDialog(scanState, onScan = { goToFailure() })

    Scaffold(
        content = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(it)
            )
        },
        bottomBar = {
            Button(
                onClick = {
                    goToMethod()
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(70.dp)
                    .padding(10.dp)
            ) {
                Text(text = "❌")
            }
        }
    )
}
