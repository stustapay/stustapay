package de.stustanet.stustapay.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.repository.ForceDeregisterState
import de.stustanet.stustapay.repository.RegistrationRepository
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
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
    private val registrationRepo: RegistrationRepository
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

    val allowForceDeregister: StateFlow<ForceDeregisterState> =
        registrationRepo.forceDeregisterState.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ForceDeregisterState.Disallow,
        )

    suspend fun register(qrcodeB64: String) {
        println("REGISTER")
        registrationRepo.register(qrcodeB64)
    }

    suspend fun deregister(force: Boolean = false) {
        registrationRepo.deregister(force)
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
