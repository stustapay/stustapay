package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import de.stustanet.stustapay.ui.nav.navigateTo

@Composable
fun DepositFailure(goToMain: () -> Unit, viewModel: DepositViewModel) {
    val haptic = LocalHapticFeedback.current

    Scaffold(
        content = {
            Box(
                modifier = Modifier.fillMaxSize().padding(bottom = it.calculateBottomPadding()),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "transaction failed", fontSize = 48.sp)
            }
        },
        bottomBar = {
            Button(
                onClick = {
                    viewModel.clear()
                    goToMain()
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                },
                modifier = Modifier.fillMaxWidth().height(70.dp).padding(10.dp)
            ) {
                Text(text = "Next")
            }
        }
    )
}