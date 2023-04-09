package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable


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
    val buttons: List<TillButton>?,
)