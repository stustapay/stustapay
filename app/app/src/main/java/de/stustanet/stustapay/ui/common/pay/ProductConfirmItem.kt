package de.stustanet.stustapay.ui.common.pay

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustanet.stustapay.model.PendingLineItem
import de.stustanet.stustapay.model.Product
import de.stustanet.stustapay.ui.theme.ProductConfirmItemBigStyle
import de.stustanet.stustapay.ui.theme.ProductConfirmItemStyle
import de.stustanet.stustapay.util.formatCurrencyValue

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
    Column {
        ProductConfirmItem(
            name = "Drahtlose Erdbeeren",
            price = 52.20,
            quantity = 13,
            bigStyle = true,
        )
        ProductConfirmItem(
            name = "Preis",
            price = 12.34,
            quantity = 5,
            bigStyle = true,
        )
    }
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
    bigStyle: Boolean = false,
) {
    val style: TextStyle = if (bigStyle) {
        ProductConfirmItemBigStyle
    } else {
        ProductConfirmItemStyle
    }

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
    ) {
        Row(
            modifier = Modifier.weight(0.5f),
        ) {
            Text(
                text = name,
                style = style,
                modifier = Modifier.padding(5.dp)
            )
        }

        Row(
            modifier = Modifier
                .padding(horizontal = 5.dp)
                .weight(0.5f),
            horizontalArrangement = Arrangement.End,
        ) {
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
                style = style,
            )

            Text(
                text = formatCurrencyValue(price),
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.6f),
                style = style,
            )
        }

    }
}
