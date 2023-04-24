package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class Account(
    val id: ULong,
    val type: String,
    val name: String,
    val comment: String,
    val balance: Double,
    val vouchers: Int,
    val user_tag_uid: ULong,
    val restriction: List<String>?
)
