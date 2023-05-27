package de.stustanet.stustapay.ui.payinout.payout

import de.stustanet.stustapay.model.NewPayOut
import de.stustanet.stustapay.model.PendingPayOut
import de.stustanet.stustapay.model.UserTag
import java.util.UUID


data class PayOutState(
    /** what tag is this payout for? */
    private var tag: UserTag? = null,

    /**
     * desired cash-out amount in cents.
     * if null, use maximum amount.
     */
    private var currentAmount: UInt? = null,

    /** true once we changed the amount - so we need another check */
    private var amountChanged: Boolean = false,

    /** after we scanned a customer, what's their account balance */
    private var checkedPayOut: CheckedPayOut? = null,

    /** so the objects become different... */
    private var serial: ULong = 0u,
) {

    fun setAmount(newAmount: UInt) {
        currentAmount = newAmount
        amountChanged = true
    }

    /** currently selected amount - in cents */
    fun getAmount(): UInt {
        return currentAmount ?: checkedPayOut?.getMaxAmount() ?: 0u
    }

    fun getNewPayOut(): NewPayOut? {
        val tagV = tag ?: return null

        // payout amount is always negative for the api
        val amount = currentAmount?.let { it.toDouble() / -100 }

        return NewPayOut(
            uuid = checkedPayOut?.uuid ?: UUID.randomUUID().toString(),
            customer_tag_uid = tagV.uid,
            amount = amount
        )
    }

    fun getCheckedPayout(): CheckedPayOut? {
        return checkedPayOut
    }

    fun wasChanged(): Boolean {
        return amountChanged
    }

    /** maximum amount - in cents */
    fun getMaxAmount(): UInt {
        return checkedPayOut?.getMaxAmount() ?: 30000u
    }

    fun updateWithPendingPayOut(pendingPayOut: PendingPayOut) {
        checkedPayOut = CheckedPayOut(
            uuid = pendingPayOut.uuid,
            maxAmount = pendingPayOut.old_balance,
            amount = pendingPayOut.amount,
            // we couldn't have created a newpayout to request the pendingpayout
            // in getNewPayout if tag was null.
            tag = tag!!,
        )
        amountChanged = false
        serial += 1u
    }

    fun getCheckedNewPayout(): NewPayOut? {
        if (wasChanged()) {
            return null
        }
        return checkedPayOut?.getNewPayOut()
    }
}