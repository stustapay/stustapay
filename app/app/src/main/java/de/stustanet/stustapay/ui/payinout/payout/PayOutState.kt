package de.stustanet.stustapay.ui.payinout.payout

import de.stustanet.stustapay.model.NewPayOut
import de.stustanet.stustapay.model.PendingPayOut
import de.stustanet.stustapay.model.UserTag
import java.util.UUID


data class PayOutState(
    /** desired cash-out amount in cents.
     * if null, use maximum amount.
     */
    var currentAmount: UInt? = null,

    /** after we scanned a customer, what's their account balance */
    var checkedPayOut: CheckedPayOut? = null,

    /** so the objects become different... */
    var serial: ULong = 0u
) {
    fun getAmount(): UInt {
        return currentAmount ?: checkedPayOut?.getMaxAmount() ?: 0u
    }

    fun getMaxAmount(): UInt {
        return checkedPayOut?.getMaxAmount() ?: 30000u
    }

    fun getNewPayOut(tag: UserTag): NewPayOut {
        // payout amount is always negative for the api
        val amount = currentAmount?.toDouble()?.times(-1)

        return NewPayOut(
            uuid = UUID.randomUUID().toString(),
            customer_tag_uid = tag.uid,
            amount = amount
        )
    }

    fun getCheckedPayOut(): NewPayOut? {
        return checkedPayOut?.getNewPayOut()
    }

    fun updateWithPendingPayOut(pendingPayOut: PendingPayOut, tag: UserTag) {
        checkedPayOut = CheckedPayOut(
            uuid = pendingPayOut.uuid,
            maxAmount = pendingPayOut.old_balance,
            amount = pendingPayOut.amount,
            tag = tag,
        )
        serial += 1u
    }
}