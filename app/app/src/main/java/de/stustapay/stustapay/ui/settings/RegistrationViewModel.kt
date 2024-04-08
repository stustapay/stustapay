package de.stustapay.stustapay.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.repository.RegistrationRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.libssp.util.Result
import de.stustapay.libssp.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject


sealed interface RegistrationUiState {
    data class Registered(
        val msg: String? = null,
        val endpointUrl: String? = null,
    ) : RegistrationUiState

    data class Error(
        val msg: String
    ) : RegistrationUiState

    object Loading : RegistrationUiState
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
            initialValue = RegistrationUiState.Loading,
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
    return regState.asResult()
        .map { registerStateResult ->
            when (registerStateResult) {
                is Result.Success -> {
                    when (val registerState = registerStateResult.data) {
                        is RegistrationState.Registered -> {
                            RegistrationUiState.Registered(
                                endpointUrl = registerState.apiUrl,
                                msg = registerState.message,
                            )
                        }

                        is RegistrationState.Error -> {
                            RegistrationUiState.Error(
                                msg = registerState.message,
                            )
                        }

                        is RegistrationState.NotRegistered -> {
                            RegistrationUiState.Error(
                                msg = registerState.message,
                            )
                        }
                    }
                }

                is Result.Loading -> {
                    RegistrationUiState.Loading
                }

                is Result.Error -> {
                    RegistrationUiState.Error(
                        registerStateResult.exception?.localizedMessage
                            ?: "unknown registration error"
                    )
                }
            }
        }
}
