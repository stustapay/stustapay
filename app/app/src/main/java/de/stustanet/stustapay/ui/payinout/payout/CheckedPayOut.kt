package de.stustanet.stustapay.ui.payinout.payout

import de.stustanet.stustapay.model.NewPayOut
import de.stustanet.stustapay.model.UserTag

data class CheckedPayOut(
    /** how much the user has on their account */
    val maxAmount: Double,

    /** how much it was requested for payout */
    val amount: Double,

    /** what's the user's tag */
    val tag: UserTag,
) {
    fun getNewPayOut(): NewPayOut {
        return NewPayOut(
            amount = amount,
            customer_tag_uid = tag.uid,
        )
    }

    fun getMaxAmount(): UInt {
        return (maxAmount * 100).toUInt()
    }
}