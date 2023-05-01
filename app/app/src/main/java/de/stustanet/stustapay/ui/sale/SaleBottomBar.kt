package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Preview
@Composable
fun PreviewSaleBottomBar() {
    SaleBottomBar(
        status = { Text("stuff") },
        saleConfig = SaleConfig(),
        onAbort = {},
        onSubmit = {},
    )
}

@Composable
fun SaleBottomBar(
    modifier: Modifier = Modifier,
    status: @Composable () -> Unit,
    saleConfig: SaleConfig,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
    // WASTEBASKET symbol
    abortText: String = "\uD83D\uDDD1",
) {
    val haptic = LocalHapticFeedback.current

    Column(
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            modifier = Modifier.padding(vertical = 3.dp)
        ) {
            status()
        }
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            modifier = Modifier.padding(vertical = 3.dp)
        ) {
            Button(
                enabled = saleConfig.ready,
                colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                },
                modifier = Modifier
                    .height(55.dp)
                    .fillMaxWidth(0.5f)
                    .padding(end = 5.dp)
            ) {

                Text(text = abortText, fontSize = 24.sp)
            }
            Button(
                enabled = saleConfig.ready,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onSubmit()
                },
                modifier = Modifier
                    .height(55.dp)
                    .fillMaxWidth()
                    .padding(start = 5.dp)
            ) {
                Text(text = "✓", fontSize = 24.sp)
            }
        }
    }
}