package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
enum class Privilege(val id: String) {
    admin("admin"),
    // orga("orga"),
    finanzorga("finanzorga"),
    cashier("cashier"),
}