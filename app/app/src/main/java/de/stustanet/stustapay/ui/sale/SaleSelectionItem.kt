package de.stustanet.stustapay.ui.sale

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.common.pay.ProductSelectionItem

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
    var sameSizeButtons = false

    val itemPrice: String
    val itemAmount: String
    var itemAmountDelimiter: String = "×"

    when (type) {
        is SaleSelectionItemType.FixedPrice -> {
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f".format(type.price.price)
            itemAmount = "%2d".format(amount)
        }

        is SaleSelectionItemType.Returnable -> {
            sameSizeButtons = true
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f".format(type.price.price)
            itemAmount = "%2d".format(amount)
        }

        is SaleSelectionItemType.FreePrice -> {
            val price: Double = type.amount?.price ?: 0.0
            itemPrice = "%.02f".format(price)
            itemAmount = ""
        }

        is SaleSelectionItemType.Vouchers -> {
            itemPrice = "%2d ".format(type.amount)
            itemAmount = "%2d".format(type.maxAmount)
            itemAmountDelimiter = "of "
        }
    }

    val rightButtonText: String
    var rightButtonFontSize = 40.sp
    when (type) {
        is SaleSelectionItemType.FixedPrice,
        is SaleSelectionItemType.Vouchers -> {
            rightButtonText = "‒"
        }

        is SaleSelectionItemType.Returnable -> {
            rightButtonText = type.incrementText
            rightButtonFontSize = 24.sp
        }

        is SaleSelectionItemType.FreePrice -> {
            // unicode: erase to the left
            rightButtonText = "⌫"
            rightButtonFontSize = 30.sp
        }
    }

    ProductSelectionItem(
        itemPrice = itemPrice.replace('.', ','),
        itemAmount = itemAmount,
        itemAmountDelimiter = itemAmountDelimiter,
        sameSizeButtons = sameSizeButtons,
        leftButtonText = caption,
        rightButtonText = rightButtonText,
        rightButtonFontSize = rightButtonFontSize,
        leftButtonPress = {
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
        rightButtonPress = {
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
        }
    )
}
