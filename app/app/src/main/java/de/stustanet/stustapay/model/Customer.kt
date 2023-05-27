package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class UserTagHistoryEntry(
    val user_tag_uid: ULong,
    val user_tag_uid_hex: String,

    val account_id: Int,
    val comment: String? = null,
    val mapping_was_valid_until: String,
)


@Serializable
data class Customer(
    // Account
    val id: ULong,
    val type: String,
    val name: String?,
    val comment: String?,
    val balance: Double,
    val vouchers: Int,
    val user_tag_uid: ULong?,
    val user_tag_uid_hex: String?,
    val user_tag_comment: String? = null,
    val restriction: List<String>?,
    val tag_history: List<UserTagHistoryEntry>,

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