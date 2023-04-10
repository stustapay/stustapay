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
    val secrets: TerminalSecrets?,
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