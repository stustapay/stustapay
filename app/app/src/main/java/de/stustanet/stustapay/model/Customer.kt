package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class SwitchTag(
    val customer_id: ULong,
    val new_user_tag_uid: ULong
)