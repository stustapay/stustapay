package de.stustapay.stustapay.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.repository.RegistrationRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject


sealed interface RegistrationUiState {
    data class HasEndpoint(
        val msg: String? = null,
        val endpointUrl: String? = null,
    ) : RegistrationUiState

    data class Message(
        val msg: String
    ) : RegistrationUiState

    object Idle : RegistrationUiState
}


@HiltViewModel
class RegistrationViewModel @Inject constructor(
    private val registrationRepo: RegistrationRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
) : ViewModel() {

    // convert the information flow from the repo to a stateflow (where we only want the latest element)
    // the `registrationUiState` helper function maps the repo flow to UI state.
    val registrationUiState: StateFlow<RegistrationUiState> = registrationUiState(
        registrationRepo = registrationRepo
    )
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = RegistrationUiState.Idle,
        )

    val allowForceDeregister = registrationRepo.forceDeregisterState

    suspend fun register(qrcodeB64: String) {
        val ok = registrationRepo.register(qrcodeB64)
        if (ok) {
            terminalConfigRepository.fetchConfig()
        }
    }

    suspend fun deregister(force: Boolean = false) {
        val ok = registrationRepo.deregister(force)
        if (ok) {
            terminalConfigRepository.clearConfig()
        }
    }
}


private fun registrationUiState(
    registrationRepo: RegistrationRepository,
): Flow<RegistrationUiState> {
    // observe if we're logged in, i.e. if the flow element != null
    val regState: Flow<RegistrationState> = registrationRepo.registrationState

    // convert the registration state to a ui registration state
    return regState.map { registerState ->
        when (registerState) {
            is RegistrationState.Registered -> {
                RegistrationUiState.HasEndpoint(
                    endpointUrl = registerState.apiUrl,
                    msg = registerState.message,
                )
            }

            is RegistrationState.Error -> {
                RegistrationUiState.Message(
                    msg = registerState.message,
                )
            }

            is RegistrationState.NotRegistered -> {
                RegistrationUiState.Message(
                    msg = registerState.message,
                )
            }

            is RegistrationState.Registering -> {
                RegistrationUiState.Message(
                    msg = "registering to ${registerState.apiUrl}..."
                )
            }
        }
    }
}
