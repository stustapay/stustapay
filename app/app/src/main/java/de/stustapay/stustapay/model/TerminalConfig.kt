package de.stustapay.stustapay.model

import kotlinx.serialization.Serializable


/**
 * nfc tag communication secrets.
 */
@Serializable
data class UserTagSecret(
    val key0: String,
    val key1: String,
)


/**
 * access keys for external apis.
 */
@Serializable
data class TerminalSecrets(
    val sumup_affiliate_key: String,
    val user_tag_secret: UserTagSecret,
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
    val profile_name: String,
    val description: String?,
    val user_privileges: List<Privilege>?,
    val allow_top_up: Boolean,
    val allow_cash_out: Boolean,
    val allow_ticket_sale: Boolean,
    val cash_register_name: String?,
    val cash_register_id: Int?,
    val buttons: List<TerminalButton>?,
    val secrets: TerminalSecrets?,
    val available_roles: List<Role>,
    val test_mode: Boolean,
    val test_mode_message: String,
)