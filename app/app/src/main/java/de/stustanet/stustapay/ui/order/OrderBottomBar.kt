package de.stustanet.stustapay.ui.order

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar

@Composable
fun OrderBottomBar(
    status: @Composable () -> Unit,
    orderConfig: OrderConfig,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current

    Column {
        Row(horizontalArrangement = Arrangement.SpaceEvenly) {
            status()
        }
        Row(horizontalArrangement = Arrangement.SpaceEvenly) {
            Button(
                enabled = orderConfig.ready,
                colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                },
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(70.dp)
                    .padding(10.dp)
            ) {
                // WASTEBASKET symbol
                Text(text = "\uD83D\uDDD1", fontSize = 24.sp)
            }
            Button(
                enabled = orderConfig.ready,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onSubmit()
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
}