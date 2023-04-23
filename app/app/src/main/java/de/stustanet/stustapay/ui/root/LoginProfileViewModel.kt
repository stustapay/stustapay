package de.stustanet.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject


sealed interface LoginProfileUIState {
    data class LoggedIn(
        val username: String,
        val privileges: String,
    ) : LoginProfileUIState

    object NotLoggedIn : LoginProfileUIState

    data class Error(
        val message: String
    ) : LoginProfileUIState
}


@HiltViewModel
class LoginProfileViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    // convert the information flow from the repo to a stateflow (where we only want the latest element)
    // the `registrationUiState` helper function maps the repo flow to UI state.
    val loginProfileUIState: StateFlow<LoginProfileUIState> = loginProfileUiState(
        userRepo = userRepository
    )
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = LoginProfileUIState.Error("Loading..."),
        )

    suspend fun fetchLogin() {
        userRepository.fetchLogin()
    }
}


private fun loginProfileUiState(
    userRepo: UserRepository,
): Flow<LoginProfileUIState> {
    // observe if we're logged in, i.e. if the flow element != null
    val regState: Flow<UserState> = userRepo.userState

    // convert the registration state to a ui registration state
    return regState.asResult()
        .map { userStateResult ->
            when (userStateResult) {
                is Result.Loading -> {
                    LoginProfileUIState.Error("waiting...")
                }

                is Result.Success -> {
                    when (val userState = userStateResult.data) {
                        is UserState.LoggedIn -> {
                            LoginProfileUIState.LoggedIn(
                                username = userState.user.login,
                                privileges = userState.user.privileges.joinToString { it.name },
                            )
                        }
                        is UserState.NoLogin -> {
                            LoginProfileUIState.NotLoggedIn
                        }
                        is UserState.Error -> {
                            LoginProfileUIState.Error(
                                message = userState.msg,
                            )
                        }
                    }
                }

                is Result.Error -> {
                    LoginProfileUIState.Error(
                        userStateResult.exception?.localizedMessage
                            ?: "unknown login state error"
                    )
                }
            }
        }
}