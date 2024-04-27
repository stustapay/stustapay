package de.stustapay.stustapay.model


sealed interface RegistrationState {
    data class Registered(
        var token: String,
        var apiUrl: String,
        var message: String? = null,
    ) : RegistrationState

    data class Registering(
        var apiUrl: String,
        var message: String? = null,
    ) : RegistrationState

    data class NotRegistered(
        var message: String
    ) : RegistrationState

    data class Error(
        val message: String
    ) : RegistrationState
}