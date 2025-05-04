package de.stustapay.stustapay.model

import kotlinx.serialization.Serializable

/**
 * defines the json format of the qr code that can be used
 * to load name and description
 */
@Serializable
data class UserCreateQRContent(
    val firstName: String? = null,
    val lastName: String? = null,
    val description: String? = null,
)
