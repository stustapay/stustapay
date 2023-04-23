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
        val price: SaleItemPrice.FreePrice,
        val amount: SaleItemAmount.FreePrice?
    ) : SaleSelectionItemType

    data class Vouchers(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val amount: Int,
        val maxAmount: Int,
    ) : SaleSelectionItemType
}

/**
 * one buyable entry in the ordering overview.
 */
@Composable
fun SaleSelectionItem(
    caption: String,
    variant: SaleSelectionItemType,
) {
    val haptic = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {

        val itemStatus = when (variant) {
            is SaleSelectionItemType.FixedPrice -> {
                val itemAmount: Int = variant.amount?.amount ?: 0
                "%.02f x %2d".format(variant.price.price, itemAmount).padStart(11)
            }
            is SaleSelectionItemType.FreePrice -> {
                val itemPrice: Double = variant.amount?.price ?: 0.0
                "%.02f".format(itemPrice).padStart(11)
            }
            is SaleSelectionItemType.Vouchers -> {
                "%2d of %2d".format(variant.amount, variant.maxAmount).padStart(11)
            }
        }

        // TODO: highlight background if not 0
        Text(
            text = itemStatus,
            modifier = Modifier.fillMaxWidth(0.25f),
            fontSize = 24.sp,
        )

        Box(modifier = Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        when (variant) {
                            is SaleSelectionItemType.FixedPrice -> {
                                variant.onIncr()
                            }
                            is SaleSelectionItemType.FreePrice -> {
                                variant.onPriceEdit(false)
                            }
                            is SaleSelectionItemType.Vouchers -> {
                                variant.onIncr()
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(90.dp)
                        .padding(5.dp)
                ) {
                    Text(text = caption, fontSize = 24.sp)
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        when (variant) {
                            is SaleSelectionItemType.FixedPrice -> {
                                variant.onDecr()
                            }
                            is SaleSelectionItemType.FreePrice -> {
                                variant.onPriceEdit(true)
                            }
                            is SaleSelectionItemType.Vouchers -> {
                                variant.onDecr()
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                        .padding(5.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red)
                ) {
                    Text(
                        text = when (variant) {
                            is SaleSelectionItemType.FixedPrice, is SaleSelectionItemType.Vouchers -> {
                                "-"
                            }
                            is SaleSelectionItemType.FreePrice -> {
                                // unicode: erase to the left
                                "⌫"
                            }
                        }, fontSize = 50.sp, color = Color.Black
                    )
                }
            }
        }
    }
}
