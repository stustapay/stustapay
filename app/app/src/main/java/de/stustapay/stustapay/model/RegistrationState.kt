package de.stustapay.stustapay.model

enum class RegistrationSource {
    UNKNOWN,
    MANUAL,
    MANAGED,
}

sealed interface RegistrationState {
    data class Registered(
        var token: String,
        var apiUrl: String,
        var message: String? = null,
        val source: RegistrationSource = RegistrationSource.UNKNOWN,
        val managedConfigDisabled: Boolean = false,
    ) : RegistrationState

    data class Registering(
        var apiUrl: String,
    ) : RegistrationState

    data class NotRegistered(
        var message: String,
        val managedConfigDisabled: Boolean = false,
    ) : RegistrationState

    data class Error(
        val message: String
    ) : RegistrationState
}

fun RegistrationState.isManagedConfigDisabled(): Boolean {
    return when (this) {
        is RegistrationState.Registered -> managedConfigDisabled
        is RegistrationState.NotRegistered -> managedConfigDisabled
        is RegistrationState.Registering -> false
        is RegistrationState.Error -> false
    }
}

fun RegistrationState.Registered.asManualRegistration(): RegistrationState.Registered {
    return copy(
        source = RegistrationSource.MANUAL,
        managedConfigDisabled = true,
    )
}

fun RegistrationState.Registered.asManagedRegistration(message: String? = this.message): RegistrationState.Registered {
    return copy(
        message = message,
        source = RegistrationSource.MANAGED,
        managedConfigDisabled = false,
    )
}
