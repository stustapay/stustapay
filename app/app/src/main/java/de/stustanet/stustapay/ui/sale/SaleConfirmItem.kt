package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.model.PendingLineItem


/**
 * line item on the order confirm view
 */
@Composable
fun SaleConfirmItem(
    lineItem: PendingLineItem,
) {
    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "%.02f x %2d".format(lineItem.product_price, lineItem.quantity),
            modifier = Modifier.fillMaxWidth(0.25f),
            fontSize = 24.sp
        )

        Box(modifier = Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Text(
                    text = lineItem.product.name,
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
