package de.stustapay.stustapay.ec

import de.stustapay.stustapay.model.UserTag
import java.math.BigDecimal

data class ECPayment(
    /** transaction identifier */
    val id: String,

    /** what tag this payment is for */
    val tag: UserTag,

    /** value without tip */
    val amount: BigDecimal,

    /** additional tip */
    val tip: BigDecimal = BigDecimal(0),
)
