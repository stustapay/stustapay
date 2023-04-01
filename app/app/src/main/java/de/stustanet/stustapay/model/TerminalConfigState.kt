package de.stustanet.stustapay.model

sealed interface TerminalConfigState {
    data class Success(
        var config: TerminalConfig
    ) : TerminalConfigState

    data class Error(
        val message: String
    ) : TerminalConfigState
}