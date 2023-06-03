package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.Column
import androidx.compose.material.ButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import de.stustanet.stustapay.ui.common.pay.ProductSelectionItem
import de.stustanet.stustapay.ui.theme.ProductButtonBigStyle
import de.stustanet.stustapay.ui.theme.ProductButtonStyle
import de.stustanet.stustapay.ui.theme.errorButtonColors
import de.stustanet.stustapay.ui.theme.okButtonColors

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
    Column {
        SaleSelectionItem(
            caption = "Robbenfutter",
            SaleSelectionItemType.FixedPrice(
                onIncr = {},
                onDecr = {},
                price = SaleItemPrice.FixedPrice(13.37),
                amount = SaleItemAmount.FixedPrice(42),
            )
        )
        SaleSelectionItem(
            caption = "Internetkanister",
            SaleSelectionItemType.FreePrice(
                onPriceEdit = {},
                amount = SaleItemAmount.FreePrice(4200u),
            )
        )
        SaleSelectionItem(
            caption = "Gutschein",
            type = SaleSelectionItemType.Vouchers(
                amount = 3,
                maxAmount = 12,
                onIncr = { },
                onDecr = { },
            )
        )
        SaleSelectionItem(
            caption = "Pfand zurück",
            type = SaleSelectionItemType.Returnable(
                price = SaleItemPrice.Returnable(2.0),
                amount = SaleItemAmount.FixedPrice(2),
                incrementText = "Extra Glas",
                onIncr = { },
                onDecr = { },
            )
        )
    }
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
    val itemAmount: String?
    var itemAmountDelimiter: String = "×"

    val rightButtonText: String
    var rightButtonStyle = ProductButtonBigStyle

    var leftButtonColors = ButtonDefaults.buttonColors()
    var rightButtonColors = errorButtonColors()

    when (type) {
        is SaleSelectionItemType.FixedPrice -> {
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f€".format(type.price.price)
            itemAmount = "%2d".format(amount)
            rightButtonText = "‒"
        }

        is SaleSelectionItemType.Returnable -> {
            sameSizeButtons = true
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f€".format(type.price.price)
            itemAmount = "%2d".format(amount)
            rightButtonText = type.incrementText
            rightButtonStyle = ProductButtonStyle
            leftButtonColors = errorButtonColors()
            rightButtonColors = okButtonColors()
        }

        is SaleSelectionItemType.FreePrice -> {
            val price: Double = (type.amount?.price?.toDouble() ?: 0.0) / 100
            itemPrice = "%.02f€".format(price)
            itemAmount = null
            rightButtonText = "⌫"
        }

        is SaleSelectionItemType.Vouchers -> {
            itemPrice = "%2d".format(type.amount)
            itemAmount = "%2d".format(type.maxAmount)
            itemAmountDelimiter = "/"
            rightButtonText = "‒"
        }
    }

    ProductSelectionItem(
        itemPrice = itemPrice,
        itemAmount = itemAmount,
        itemAmountDelimiter = itemAmountDelimiter,
        sameSizeButtons = sameSizeButtons,
        leftButtonText = caption,
        leftButtonColors = leftButtonColors,
        rightButtonText = rightButtonText,
        rightButtonStyle = rightButtonStyle,
        rightButtonColors = rightButtonColors,
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
