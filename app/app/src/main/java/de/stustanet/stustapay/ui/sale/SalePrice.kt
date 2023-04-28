package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SalePrice(price: Double) {
    Row(horizontalArrangement = Arrangement.Start) {
        Text(
            text = "${"%.02f".format(price).padStart(5)} €",
            modifier = Modifier
                .padding(2.dp),
            fontSize = 26.sp,
            fontFamily = FontFamily.Monospace,
        )
    }
}