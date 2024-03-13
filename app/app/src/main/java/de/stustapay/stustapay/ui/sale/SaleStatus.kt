package de.stustapay.stustapay.ui.sale

import android.util.Log
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.Button
import de.stustapay.api.models.NewSale
import de.stustapay.api.models.PendingSale
import de.stustapay.api.models.TerminalButton
import de.stustapay.api.models.UserTag
import java.lang.Integer.max
import java.lang.Integer.min
import java.util.UUID


/**
 * What price does a sale item button have?
 */
sealed interface SaleItemPrice {
    data class FixedPrice(val price: Double) : SaleItemPrice
    data class FreePrice(val defaultPrice: Double?) : SaleItemPrice
    data class Returnable(val price: Double?) : SaleItemPrice

    companion object {
        fun fromTerminalButton(button: TerminalButton): SaleItemPrice {
            return if (button.isReturnable) {
                Returnable(price = button.price?.toDouble() ?: 0.0)
            } else if (button.fixedPrice) {
                FixedPrice(price = button.price?.toDouble() ?: 0.0)
            } else {
                FreePrice(defaultPrice = button.defaultPrice?.toDouble())
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
    data class FreePrice(var price: UInt) : SaleItemAmount
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
        // remember what the check was
        // it contains the used vouchers.
        // only if we adjust it, update this.voucherAmount.
        checkedSale = pendingSale

        // set the custom amount to the "optimum" calculated by server
        // only if we did customize the amount
        if (voucherAmount != null) {
            voucherAmount = pendingSale.usedVouchers.intValue()
        }

        // update button selections
        buttonSelection = pendingSale.buttons.mapNotNull {
            val quantity = it.quantity
            val price = it.price
            val amount: Pair<Int, SaleItemAmount>? = if (quantity != null) {
                Pair(it.tillButtonId.intValue(), SaleItemAmount.FixedPrice(quantity.intValue()))
            } else if (price != null) {
                Pair(it.tillButtonId.intValue(), SaleItemAmount.FreePrice((price * 100).toUInt()))
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
        val check = checkedSale ?: return
        val newAmount = (voucherAmount ?: check.usedVouchers.intValue()) + 1

        // only set voucherAmount if we actually change it
        if (newAmount <= check.oldVoucherBalance.intValue()) {
            voucherAmount = newAmount
        }
    }

    fun decrementVouchers() {
        val check = checkedSale ?: return
        val newAmount = (voucherAmount ?: check.usedVouchers.intValue()) - 1

        // only set voucherAmount if we actually change it
        if (newAmount >= 0) {
            voucherAmount = newAmount
        }
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
                    // ignore decrement on unset button
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
                        if (current is SaleItemAmount.FreePrice) {
                            current.price = setPrice.price
                        } else {
                            buttonSelection += Pair(
                                buttonId,
                                SaleItemAmount.FreePrice(price = setPrice.price)
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
            buttons = buttonSelection.mapNotNull {
                when (val amount = it.value) {
                    is SaleItemAmount.FixedPrice -> {
                        // regular or returnable purchase product
                        if (amount.amount != 0) {
                            Button(
                                tillButtonId = it.key.toBigInteger(),
                                quantity = amount.amount.toBigInteger(),
                            )
                        } else {
                            null
                        }
                    }
                    is SaleItemAmount.FreePrice -> {
                        Button(
                            tillButtonId = it.key.toBigInteger(),
                            price = amount.price.toDouble() / 100,
                        )
                    }
                }
            }.toList(),
            customerTagUid = tag.uid,
            usedVouchers = voucherAmount?.toBigInteger(),
            uuid = checkedSale?.uuid ?: UUID.randomUUID()
        )
    }
}