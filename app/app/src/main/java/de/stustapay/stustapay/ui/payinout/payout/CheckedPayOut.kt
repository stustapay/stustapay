package de.stustapay.stustapay.ui.payinout.payout

import de.stustapay.api.models.NewPayOut
import de.stustapay.libssp.model.NfcTag
import java.util.UUID
import kotlin.math.roundToInt

data class CheckedPayOut(
    /** how much the user has on their account */
    val maxAmount: Double,

    /** how much it was requested for payout */
    val amount: Double,

    /** what's the user's tag */
    val tag: NfcTag,

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
        return (maxAmount * 100).roundToInt().toUInt()
    }
}