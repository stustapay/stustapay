package de.stustapay.stustapay.ui.payinout.payout

import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.model.NewPayOut

data class CheckedPayOut(
    /** how much the user has on their account */
    val maxAmount: Double,

    /** how much it was requested for payout */
    val amount: Double,

    /** what's the user's tag */
    val tag: UserTag,

    val uuid: String,
) {
    fun getNewPayOut(): NewPayOut {
        return NewPayOut(
            uuid = uuid,
            customer_tag_uid = tag.uid.ulongValue(),
            amount = amount,
        )
    }

    /** max amount in cents */
    fun getMaxAmount(): UInt {
        return (maxAmount * 100).toUInt()
    }
}