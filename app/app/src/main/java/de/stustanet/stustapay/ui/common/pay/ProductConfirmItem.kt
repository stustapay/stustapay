package de.stustanet.stustapay.ui.common.pay

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.model.PendingLineItem
import de.stustanet.stustapay.model.Product

@Preview
@Composable
fun PreviewProductConfirmLineItem() {
    ProductConfirmLineItem(
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

@Composable
fun ProductConfirmLineItem(
    lineItem: PendingLineItem,
) {
    ProductConfirmItem(
        name = lineItem.product.name,
        quantity = lineItem.quantity,
        price = lineItem.product_price,
    )
}

@Preview
@Composable
fun PreviewSaleConfirmItem() {
    ProductConfirmItem(
        name = "Drahtlose Erdbeeren",
        price = 52.20,
        fontSize = 40.sp,
    )
}

/**
 * line item on the order confirm view
 */
@Composable
fun ProductConfirmItem(
    modifier: Modifier = Modifier,
    name: String,
    price: Double? = null,
    quantity: Int? = null,
    fontSize: TextUnit = 24.sp,
) {
    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
    ) {

        Row(
            modifier = Modifier
                .padding(horizontal = 10.dp)
                .weight(0.45f),
            horizontalArrangement = Arrangement.End,
        ) {
            Text(
                text = if (price != null) {
                    "%.02f".format(price).replace('.', ',')
                } else {
                    ""
                },
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.6f),
                fontSize = fontSize
            )

            Text(
                text = if (quantity != null) {
                    "%s%3d".format(
                        if (price != null) {
                            "×"
                        } else {
                            ""
                        }, quantity
                    )
                } else {
                    ""
                },
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.4f),
                fontSize = fontSize
            )
        }

        Row(
            modifier = Modifier.weight(0.55f),
        ) {
            Text(
                text = name,
                fontSize = fontSize,
                modifier = Modifier
                    .padding(5.dp)
            )
        }
    }
}
