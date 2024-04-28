package de.stustapay.stustapay.ec

import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import java.math.BigDecimal

data class ECPayment(
    /** transaction identifier */
    val id: String,

    /** what tag this payment is for */
    val tag: NfcTag,

    /** value without tip */
    val amount: BigDecimal,

    /** additional tip */
    val tip: BigDecimal = BigDecimal(0),
)
