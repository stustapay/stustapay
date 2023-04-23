package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable


/**
 * access keys for external apis.
 */
@Serializable
data class TerminalSecrets(
    val sumup_affiliate_key: String,
)

/**
 * TerminalButton from core model.
 */
@Serializable
data class TerminalButton(
    val id: Int,
    val name: String,
    val price: Double?,
    val price_in_vouchers: Int?,
    val price_per_voucher: Double?,
    val default_price: Double?,
    val is_returnable: Boolean,
    val fixed_price: Boolean,
)

/**
 * TerminalConfig from core model.
 */
@Serializable
data class TerminalConfig(
    val id: Int,
    val name: String,
    val description: String?,
    val user_privileges: List<Privilege>?,
    val allow_top_up: Boolean,
    val allow_cash_out: Boolean,
    val buttons: List<TerminalButton>?,
    val secrets: TerminalSecrets?,
)