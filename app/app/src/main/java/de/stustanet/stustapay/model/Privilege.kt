package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

/**
 * Privilege from core model.
 */
@Serializable
enum class Privilege(val id: String) {
    admin("admin"),
    // orga("orga"),
    finanzorga("finanzorga"),
    cashier("cashier"),
}