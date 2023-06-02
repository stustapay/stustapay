package de.stustanet.stustapay.storage

import de.stustanet.stustapay.model.RegistrationState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RegistrationLocalDataSource @Inject constructor() {
    var _registrationState =
        MutableStateFlow<RegistrationState>(RegistrationState.NotRegistered("deregistered"))
    val registrationState = _registrationState.asStateFlow()

    fun setState(registrationState: RegistrationState.Registered) {
        _registrationState.update { registrationState }
    }

    fun delete() {
        _registrationState.update { RegistrationState.NotRegistered("deregistered") }
    }
}