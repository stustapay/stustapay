package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.model.PendingLineItem
import de.stustanet.stustapay.model.Product

@Preview
@Composable
fun PreviewSaleConfirmItem() {
    SaleConfirmItem(
        PendingLineItem(
            quantity = 12,
            product = Product(
                name = "Fingerbox",
                price = 13.37,
                tax_name = "eust",
                id = 42,
                tax_rate = 0.19,
            ),
            tax_name = "eust",
            product_price = 13.37,
            tax_rate = 0.19,
        )
    )
}

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
        modifier = Modifier.fillMaxWidth().height(50.dp)
    ) {

        Row(
            modifier = Modifier.padding(horizontal = 10.dp).weight(0.4f),
            horizontalArrangement = Arrangement.End,
        ) {
            Text(
                text = "%.02f".format(lineItem.product_price).replace('.', ','),
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.25f),
                fontSize = 24.sp
            )

            Text(
                text = "×%2d".format(lineItem.quantity),
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.25f),
                fontSize = 24.sp
            )
        }

        Row(
            modifier = Modifier.weight(0.6f),
        ) {
            Text(
                text = lineItem.product.name,
                fontSize = 24.sp,
                modifier = Modifier
                    .padding(5.dp)
            )
        }
    }
}
