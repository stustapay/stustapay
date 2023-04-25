package de.stustanet.stustapay.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Privilege from core model.
 */
@Serializable
enum class Privilege {
    @SerialName("admin")
    admin,

    // orga("orga"),

    @SerialName("finanzorga")
    finanzorga,

    @SerialName("cashier")
    cashier,
}