package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable


@Serializable
data class Customer(
    // Account
    val id: ULong,
    val type: String,
    val name: String,
    val comment: String,
    val balance: Double,
    val vouchers: Int,
    val user_tag_uid: ULong,
    val restriction: List<String>?,

    // Customer
    val iban: String?,
    val account_name: String?,
    val email: String?,
)


@Serializable
data class SwitchTag(
    val customer_id: ULong,
    val new_user_tag_uid: ULong
)