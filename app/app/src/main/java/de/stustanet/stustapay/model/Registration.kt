package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

/**
 * TerminalRegistrationSuccess from core model.
 */
@Serializable
data class TerminalRegistrationSuccess(
    var token: String
)

/**
 * as defined in the administration's registration ui qrcode generator
 */
@Serializable
data class RegisterQRCodeContent(
    val core_url: String,
    val registration_uuid: String,
)
