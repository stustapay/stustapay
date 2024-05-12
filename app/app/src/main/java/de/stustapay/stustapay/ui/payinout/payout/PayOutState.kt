package de.stustapay.stustapay.ui.payinout.payout

import de.stustapay.api.models.NewPayOut
import de.stustapay.api.models.PendingPayOut
import de.stustapay.libssp.model.NfcTag
import java.util.UUID


data class PayOutState(
    /** what tag is this payout for? */
    private var tag: NfcTag? = null,

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
        // try one by one:
        // use locally changed amount
        // use checked payout maximum account funds
        // fall back to zero
        return currentAmount ?: checkedPayOut?.getMaxAmount() ?: 0u
    }

    fun getNewPayOut(): NewPayOut? {
        val tagV = tag ?: return null

        // payout amount is always negative for the api
        // pass null (meaning max amount) if we didn't change the amount locally.
        val amount = currentAmount?.let { it.toDouble() / -100 }

        return NewPayOut(
            uuid = UUID.fromString(checkedPayOut?.uuid) ?: UUID.randomUUID(),
            customerTagUid = tagV.uid,
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
            uuid = pendingPayOut.uuid.toString(),
            maxAmount = pendingPayOut.oldBalance,
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