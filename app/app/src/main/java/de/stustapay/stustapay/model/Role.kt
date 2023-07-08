package de.stustapay.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class Role(
    val name: String = "",
    val is_privileged: Boolean = false,
    val privileges: List<Privilege> = List(0) { Privilege.account_management },
    val id: ULong = 0uL
)