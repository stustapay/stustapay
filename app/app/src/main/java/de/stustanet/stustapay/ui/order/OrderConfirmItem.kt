package de.stustanet.stustapay.ui.order

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * line item on the order confirm view
 */
@Composable
fun OrderConfirmItem(
    caption: String,
    price: Double,
    amount: Int,
) {
    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "%.02f x %2d".format(price, amount),
            modifier = Modifier.fillMaxWidth(0.25f),
            fontSize = 24.sp
        )

        Box(modifier = Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Text(
                    text = caption,
                    fontSize = 24.sp,
                    modifier = Modifier
                        .padding(5.dp)
                        .height(90.dp)
                        .fillMaxWidth()
                )
            }
        }
    }
}
