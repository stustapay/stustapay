package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import de.stustanet.stustapay.ui.chipscan.ChipScanDialog
import de.stustanet.stustapay.ui.nav.navigateTo

@Composable
fun DepositCash(goToMethod: () -> Unit, goToSuccess: () -> Unit, goToFailure: () -> Unit, viewModel: DepositViewModel) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current
    var scanning by remember { mutableStateOf(false) }

    Scaffold(
        content = { paddingValues ->
            Box(
                modifier = Modifier.fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("%.2f€".format(uiState.currentAmount.toFloat() / 100), fontSize = 48.sp)
                    Text("received", fontSize = 48.sp)
                }
            }
        },
        bottomBar = {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        goToMethod()
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                    modifier = Modifier.fillMaxWidth(0.5f).height(70.dp).padding(10.dp)
                ) {
                    Text(text = "❌")
                }
                Button(
                    onClick = {
                        scanning = true
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                    modifier = Modifier.fillMaxWidth().height(70.dp).padding(10.dp)
                ) {
                    Text(text = "✓")
                }
            }
        }
    )

    if (scanning) {
        ChipScanDialog(
            onScan = { goToSuccess() },
            onDismissRequest = { scanning = false }
        )
    }
}