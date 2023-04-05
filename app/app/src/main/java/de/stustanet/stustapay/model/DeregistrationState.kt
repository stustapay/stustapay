package de.stustanet.stustapay.model

sealed interface DeregistrationState {
    object Deregistered : DeregistrationState

    data class Error(
        val message: String
    ) : DeregistrationState
}