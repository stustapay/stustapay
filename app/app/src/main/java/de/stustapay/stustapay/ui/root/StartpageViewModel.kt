package de.stustapay.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.stustapay.util.Result
import de.stustapay.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject


sealed interface LoginProfileUIState {
    data class LoggedIn(
        val username: String,
        val role: String,
    ) : LoginProfileUIState

    object NotLoggedIn : LoginProfileUIState

    data class Error(
        val message: String
    ) : LoginProfileUIState
}


@HiltViewModel
class StartpageViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {
    private val _user = userRepository.userState
    private val _terminal = terminalConfigRepository.terminalConfigState

    private val _configLoading = MutableStateFlow(false)
    val configLoading = _configLoading.asStateFlow()

    val uiState = combine(_user, _terminal) { user, terminal ->
        TerminalLoginState(user, terminal)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = TerminalLoginState(),
    )

    val loginProfileUIState: StateFlow<LoginProfileUIState> = loginProfileUiState(
        userState = userRepository.userState
    ).stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = LoginProfileUIState.Error("Loading..."),
    )

    suspend fun fetchAccessData() {
        try {
            _configLoading.update { true }
            userRepository.fetchLogin()
            terminalConfigRepository.fetchConfig()
        } finally {
            _configLoading.update { false }
        }
    }
}


private fun loginProfileUiState(
    userState: StateFlow<UserState>,
): Flow<LoginProfileUIState> {

    // convert the registration state to a ui registration state
    return userState.asResult()
        .map { userStateResult ->
            when (userStateResult) {
                is Result.Loading -> {
                    LoginProfileUIState.Error("loading...")
                }

                is Result.Success -> {
                    when (val state = userStateResult.data) {
                        is UserState.LoggedIn -> {
                            if (state.user.activeRoleName != null) {
                                LoginProfileUIState.LoggedIn(
                                    username = state.user.login,
                                    role = state.user.activeRoleName!!
                                )
                            } else {
                                LoginProfileUIState.Error(
                                    message = "no active role provided",
                                )
                            }
                        }

                        is UserState.NoLogin -> {
                            LoginProfileUIState.NotLoggedIn
                        }

                        is UserState.Error -> {
                            LoginProfileUIState.Error(
                                message = state.msg,
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