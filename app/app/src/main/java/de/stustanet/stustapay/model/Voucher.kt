package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class GrantVouchers(
    val vouchers: Int,
    val user_tag_uid: ULong
)