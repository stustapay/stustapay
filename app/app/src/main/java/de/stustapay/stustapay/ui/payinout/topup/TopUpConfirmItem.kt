package de.stustapay.stustapay.ui.payinout.topup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.libssp.ui.theme.ProductConfirmItemBigStyle
import de.stustapay.libssp.ui.theme.ProductConfirmItemStyle


@Preview
@Composable
fun PreviewTopUpConfirmItem() {
    Column {
        TopUpConfirmItem(
            name = "Altes Guthaben",
            price = 13.37,
            bigStyle = false,
        )
        TopUpConfirmItem(
            name = "Neues Guthaben",
            price = 13.37,
            bigStyle = true,
        )
    }
}

/**
 * line item on the topup success view
 */
@Composable
fun TopUpConfirmItem(
    modifier: Modifier = Modifier,
    name: String,
    price: Double? = null,
    bigStyle: Boolean = false,
) {
    val style = if (bigStyle) {
        ProductConfirmItemBigStyle
    } else {
        ProductConfirmItemStyle
    }

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
                .weight(0.3f),
            horizontalArrangement = Arrangement.End,
        ) {
            Text(
                text = if (price != null) {
                    "%.02f€".format(price)
                } else {
                    ""
                },
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.6f),
                style = style
            )
        }

        Row(
            modifier = Modifier.weight(0.7f),
        ) {
            Text(
                text = name,
                style = style,
                modifier = Modifier
                    .padding(5.dp)
            )
        }
    }
}
