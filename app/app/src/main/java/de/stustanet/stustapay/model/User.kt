package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Int,
    val login: String,
    val display_name: String,
    val privileges: List<Privilege>,
    val description: String?,
    val user_tag: Int? = null,
    val transport_account_id: Int? = null,
    val cashier_account_id: Int? = null,
)

@Serializable
data class UserTag(
    val uid: ULong,
)