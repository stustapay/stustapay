package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import de.stustanet.stustapay.ui.chipscan.ChipScanDialog
import de.stustanet.stustapay.ui.nav.navigateTo

@Composable
fun DepositCard(nav: NavHostController, viewModel: DepositViewModel) {
    val haptic = LocalHapticFeedback.current
    var scanning by remember { mutableStateOf(false) }

    LaunchedEffect(nav) {
        scanning = true
    }

    Scaffold(
        content = {
            Box(Modifier.fillMaxSize().padding(it))
        },
        bottomBar = {
            Button(
                onClick = {
                    nav.navigateTo("method")
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                },
                modifier = Modifier.fillMaxWidth().height(70.dp).padding(10.dp)
            ) {
                Text(text = "❌")
            }
        }
    )

    if (scanning) {
        ChipScanDialog(
            onScan = { nav.navigateTo("failure") },
            onDismissRequest = { scanning = false }
        )
    }
}