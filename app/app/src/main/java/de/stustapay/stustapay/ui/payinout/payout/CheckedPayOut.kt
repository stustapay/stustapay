package de.stustapay.stustapay.ui.payinout.payout

import de.stustapay.api.models.NewPayOut
import de.stustapay.api.models.UserTag
import java.util.UUID

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
            uuid = UUID.fromString(uuid),
            customerTagUid = tag.uid,
            amount = amount,
        )
    }

    /** max amount in cents */
    fun getMaxAmount(): UInt {
        return (maxAmount * 100).toUInt()
    }
}