package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import de.stustanet.stustapay.ui.nav.navigateTo

@Composable
fun DepositMethod(nav: NavHostController, viewModel: DepositViewModel) {
    val haptic = LocalHapticFeedback.current

    Scaffold(
        content = { paddingValues ->
            Column(modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
            ) {
                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.5f)
                        .padding(20.dp),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        nav.navigateTo("cash")
                    }
                ) {
                    Text("cash", fontSize = 48.sp)
                }
                Button(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        nav.navigateTo("card")
                    }
                ) {
                    Text("card", fontSize = 48.sp)
                }
            }
        },
        bottomBar = {
            Button(
                onClick = {
                    viewModel.clear()
                    nav.navigateTo("main")
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