package de.stustanet.stustapay.ui.order

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * one buyable entry in the ordering overview.
 */
@Composable
fun OrderItem(
    caption: String,
    price: Double,
    amount: Int,
    onIncr: () -> Unit,
    onDecr: () -> Unit
) {
    val haptic = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        // TODO: highlight background color if amount > 0
        Text(
            text = "%.02f x %2d".format(price, amount),
            modifier = Modifier.fillMaxWidth(0.25f),
            fontSize = 24.sp
        )

        Box(modifier = Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onIncr()
                    },
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(90.dp)
                        .padding(5.dp)
                ) {
                    Text(text = caption, fontSize = 24.sp)
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDecr()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                        .padding(5.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red)
                ) {
                    Text(text = "-", fontSize = 50.sp, color = Color.Black)
                }
            }
        }
    }
}
