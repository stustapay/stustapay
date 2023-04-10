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

/**
 * Terminal configuration including validity state.
 */
sealed interface TerminalConfigState {
    object Loading : TerminalConfigState

    data class Success(
        var config: TerminalConfig
    ) : TerminalConfigState

    data class Error(
        val message: String
    ) : TerminalConfigState
}