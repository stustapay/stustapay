package de.stustapay.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class GrantVouchers(
    val vouchers: UInt,
    val user_tag_uid: ULong
)