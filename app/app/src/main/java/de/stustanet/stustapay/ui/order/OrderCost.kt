package de.stustanet.stustapay.ui.order

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun OrderCost(order: Order) {
    Text(
        "${"%.02f".format(order.sum).padStart(5)} €",
        modifier = Modifier
            .padding(2.dp)
            .fillMaxWidth(),
        fontSize = 26.sp,
        fontFamily = FontFamily.Monospace,
    )
}