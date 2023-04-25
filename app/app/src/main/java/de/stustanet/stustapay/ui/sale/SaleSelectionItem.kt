package de.stustanet.stustapay.ui.sale

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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

sealed interface SaleSelectionItemType {
    data class FixedPrice(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val price: SaleItemPrice.FixedPrice,
        val amount: SaleItemAmount.FixedPrice?
    ) : SaleSelectionItemType

    data class FreePrice(
        val onPriceEdit: (clear: Boolean) -> Unit,
        val amount: SaleItemAmount.FreePrice?
    ) : SaleSelectionItemType

    data class Vouchers(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val amount: Int,
        val maxAmount: Int,
    ) : SaleSelectionItemType

    data class Returnable(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val price: SaleItemPrice.Returnable,
        val amount: SaleItemAmount.FixedPrice?,
        val incrementText: String,
    ) : SaleSelectionItemType
}

@Preview
@Composable
fun PreviewSaleSelectionItem() {
    SaleSelectionItem(
        caption = "Robbenfutter",
        SaleSelectionItemType.FixedPrice(
            onIncr = {},
            onDecr = {},
            price = SaleItemPrice.FixedPrice(13.37),
            amount = SaleItemAmount.FixedPrice(42),
        )
    )
}

/**
 * one buyable entry in the ordering overview.
 */
@Composable
fun SaleSelectionItem(
    caption: String,
    type: SaleSelectionItemType,
) {
    val haptic = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        var sameSizeButtons = false

        val itemPrice: String
        val itemAmount: String

        when (type) {
            is SaleSelectionItemType.FixedPrice -> {
                val amount: Int = type.amount?.amount ?: 0
                itemPrice = "%.02f".format(type.price.price)
                itemAmount = "×%2d".format(amount)
            }
            is SaleSelectionItemType.Returnable -> {
                sameSizeButtons = true
                val amount: Int = type.amount?.amount ?: 0
                itemPrice = "%.02f".format(type.price.price)
                itemAmount = "×%2d".format(amount)
            }
            is SaleSelectionItemType.FreePrice -> {
                val price: Double = type.amount?.price ?: 0.0
                itemPrice = "%.02f".format(price)
                itemAmount = ""
            }
            is SaleSelectionItemType.Vouchers -> {
                itemPrice = "%2d".format(type.amount)
                itemAmount = "of %2d".format(type.maxAmount)
            }
        }

        Row(
            modifier = Modifier.padding(horizontal = 10.dp).weight(0.25f),
            horizontalArrangement = Arrangement.End,
        ) {
            // TODO: highlight background if not 0

            Text(
                text = itemPrice.replace('.', ','),
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(1f),
                fontSize = 24.sp,
            )

            Text(
                text = itemAmount,
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(1f),
                fontSize = 24.sp,
            )
        }

        Box(modifier = Modifier.weight(0.75f)) {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        when (type) {
                            is SaleSelectionItemType.FixedPrice -> {
                                type.onIncr()
                            }
                            is SaleSelectionItemType.Returnable -> {
                                type.onDecr()
                            }
                            is SaleSelectionItemType.FreePrice -> {
                                type.onPriceEdit(false)
                            }
                            is SaleSelectionItemType.Vouchers -> {
                                type.onIncr()
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth(
                            if (sameSizeButtons) {
                                0.6f
                            } else {
                                0.7f
                            }
                        )
                        .height(90.dp)
                        .padding(5.dp)
                ) {
                    Text(text = caption, fontSize = 24.sp)
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        when (type) {
                            is SaleSelectionItemType.FixedPrice -> {
                                type.onDecr()
                            }
                            is SaleSelectionItemType.Returnable -> {
                                type.onIncr()
                            }
                            is SaleSelectionItemType.FreePrice -> {
                                type.onPriceEdit(true)
                            }
                            is SaleSelectionItemType.Vouchers -> {
                                type.onDecr()
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                        .padding(5.dp),
                    colors = if (sameSizeButtons) {
                        ButtonDefaults.buttonColors()
                    } else {
                        ButtonDefaults.buttonColors(backgroundColor = Color.Red)
                    }
                ) {
                    val text: String
                    var fontSize = 50.sp
                    when (type) {
                        is SaleSelectionItemType.FixedPrice,
                        is SaleSelectionItemType.Vouchers -> {
                            text = "-"
                        }
                        is SaleSelectionItemType.Returnable -> {
                            text = type.incrementText
                            fontSize = 24.sp
                        }
                        is SaleSelectionItemType.FreePrice -> {
                            // unicode: erase to the left
                            text = "⌫"
                            fontSize = 30.sp
                        }
                    }
                    Text(
                        text = text, fontSize = fontSize, color = Color.Black
                    )
                }
            }
        }
    }
}
