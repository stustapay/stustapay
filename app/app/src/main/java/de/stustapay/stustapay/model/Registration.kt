package de.stustapay.stustapay.model

import kotlinx.serialization.Serializable

/**
 * as defined in the administration's registration ui qrcode generator
 */
@Serializable
data class RegisterQRCodeContent(
    val core_url: String,
    val registration_uuid: String,
)
