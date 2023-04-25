package de.stustanet.stustapay.ui.sale

import android.util.Log
import de.stustanet.stustapay.model.*
import java.lang.Integer.max
import java.lang.Integer.min


/**
 * What price does a sale item button have?
 */
sealed interface SaleItemPrice {
    data class FixedPrice(val price: Double) : SaleItemPrice
    data class FreePrice(val defaultPrice: Double?) : SaleItemPrice
    data class Returnable(val price: Double?) : SaleItemPrice

    companion object {
        fun fromTerminalButton(button: TerminalButton): SaleItemPrice {
            return if (button.is_returnable) {
                Returnable(price = button.price ?: 0.0)
            } else if (button.fixed_price) {
                FixedPrice(price = button.price ?: 0.0)
            } else {
                FreePrice(defaultPrice = button.default_price)
            }
        }
    }
}


/**
 * how much of a sale item was actually selected/which price was configured?
 * The price is in cents.
 */
sealed interface SaleItemAmount {
    data class FixedPrice(var amount: Int) : SaleItemAmount
    data class FreePrice(var price: Double) : SaleItemAmount
}


/**
 * If an item has free price selection, what price was entered?
 */
sealed interface FreePrice {
    object Unset : FreePrice
    data class Set(val price: UInt) : FreePrice
}


/**
 * What was ordered?
 * This is converted to a NewOrder for server submission.
 * This is updated from the PendingOrder after a server check.
 */
data class SaleStatus(
    /**
     * How many vouchers should be selected?
     * The value is initialized from the server when checking the sale.
     */
    var voucherAmount: Int? = null,

    /**
     * What user is this sale for?
     */
    var tag: UserTag? = null,

    /**
     * Which buttons were selected how often?
     * If it's a free-price button, store the entered value.
     *
     * Map button-id -> amount.
     */
    var buttonSelection: MutableMap<Int, SaleItemAmount> = mutableMapOf(),

    /**
     * if we have used the server for checking the sale, this is what it returned to us.
     */
    var checkedSale: PendingSale? = null,

    /**
     * serial number so sale status doesn't equal - so the flow will always update...
     * otherwise this SaleStatus would == the updated one.
     * i'm really sorry for this.
     */
    var statusSerial: ULong = 0u,
) {

    /** when the server reports back from the newsale check */
    fun updateWithPendingSale(pendingSale: PendingSale) {
        // vouchers for adjustment
        voucherAmount = pendingSale.used_vouchers

        // remember what the check was
        checkedSale = pendingSale

        // update button selections
        buttonSelection = pendingSale.buttons.mapNotNull {
            val quantity = it.quantity
            val price = it.price
            val amount: Pair<Int, SaleItemAmount>? = if (quantity != null) {
                Pair(it.till_button_id, SaleItemAmount.FixedPrice(quantity))
            } else if (price != null) {
                Pair(it.till_button_id, SaleItemAmount.FreePrice(price))
            } else {
                null
            }
            amount
        }.associate {
            it
        }.toMutableMap()
        statusSerial += 1u
    }

    fun incrementVouchers() {
        val check = checkedSale
        val amount = voucherAmount
        if (amount == null || check == null) {
            return
        }
        voucherAmount = min(check.old_voucher_balance, amount + 1)
    }

    fun decrementVouchers() {
        val check = checkedSale
        val amount = voucherAmount
        if (amount == null || check == null) {
            return
        }
        voucherAmount = max(0, amount - 1)
    }

    fun incrementButton(buttonId: Int, saleConfig: SaleConfig) {
        val current = buttonSelection[buttonId]
        val button = saleConfig.buttons[buttonId] ?: return
        when (button.price) {
            is SaleItemPrice.FixedPrice,
            is SaleItemPrice.Returnable -> {
                if (current is SaleItemAmount.FixedPrice) {
                    current.amount = current.amount + 1
                } else {
                    buttonSelection += Pair(
                        buttonId,
                        SaleItemAmount.FixedPrice(amount = 1)
                    )
                }
            }
            is SaleItemPrice.FreePrice -> {
                Log.e("StuStaPay", "increment on free price item invalid!")
            }
        }
        statusSerial += 1u
    }

    fun decrementButton(buttonId: Int, saleConfig: SaleConfig) {
        val current = buttonSelection[buttonId]
        val button = saleConfig.buttons[buttonId] ?: return
        when (button.price) {
            is SaleItemPrice.FixedPrice -> {
                if (current is SaleItemAmount.FixedPrice) {
                    val newAmount = max(0, current.amount - 1)
                    if (newAmount != 0) {
                        current.amount = newAmount
                    } else {
                        buttonSelection.remove(buttonId)
                    }
                } else {
                    // ignore decrement on onset button
                }
            }
            is SaleItemPrice.Returnable -> {
                if (current is SaleItemAmount.FixedPrice) {
                    current.amount = current.amount - 1
                } else {
                    buttonSelection += Pair(
                        buttonId,
                        SaleItemAmount.FixedPrice(amount = -1)
                    )
                }
            }
            is SaleItemPrice.FreePrice -> {
                Log.e("StuStaPay", "decrement on free price item invalid!")
            }
        }
        statusSerial += 1u
    }

    fun adjustPrice(buttonId: Int, setPrice: FreePrice, saleConfig: SaleConfig) {
        val current = buttonSelection[buttonId]
        val button = saleConfig.buttons[buttonId] ?: return
        when (button.price) {
            is SaleItemPrice.FreePrice -> {
                when (setPrice) {
                    is FreePrice.Set -> {
                        // convert from cents to euro here.
                        val newPrice = setPrice.price.toDouble() / 100
                        if (current is SaleItemAmount.FreePrice) {
                            current.price = newPrice
                        } else {
                            buttonSelection += Pair(
                                buttonId,
                                SaleItemAmount.FreePrice(price = newPrice)
                            )
                        }
                    }
                    is FreePrice.Unset -> {
                        if (current is SaleItemAmount.FreePrice) {
                            buttonSelection.remove(buttonId)
                        } else {
                            // selection is not stored anyway
                        }
                    }
                }
            }
            is SaleItemPrice.FixedPrice,
            is SaleItemPrice.Returnable -> {
                Log.e("StuStaPay", "adjustprice on non-free-price item invalid!")
            }
        }
        statusSerial += 1u
    }

    fun getNewSale(tag: UserTag): NewSale {
        return NewSale(
            buttons = buttonSelection.map {
                when (val amount = it.value) {
                    is SaleItemAmount.FixedPrice -> {
                        // regular or returnable purchase product
                        Button(
                            till_button_id = it.key,
                            quantity = amount.amount,
                        )
                    }
                    is SaleItemAmount.FreePrice -> {
                        Button(
                            till_button_id = it.key,
                            price = amount.price,
                        )
                    }
                }
            }.toList(),
            customer_tag_uid = tag.uid,
        )
    }
}