package de.stustanet.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.CurrentUser
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject


class StartPageUiState(
    private val user: UserState = UserState.NoLogin,
    private val terminal: TerminalConfigState = TerminalConfigState.Loading
) {
    data class StartTitle(val title: String, val subtitle: String? = null)
    fun title(): StartTitle {
        return if (terminal is TerminalConfigState.Success) {
            StartTitle(terminal.config.name, terminal.config.description)
        } else {
            StartTitle("StuStaPay")
        }
    }
    fun checkAccess(access: (CurrentUser, TerminalConfig) -> Boolean): Boolean {
        return if (user is UserState.LoggedIn && terminal is TerminalConfigState.Success) {
            access(user.user, terminal.config)
        } else {
            false
        }
    }
}


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

    val uiState = combine(_user, _terminal) { user, terminal ->
        StartPageUiState(user, terminal)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = StartPageUiState(),
    )

    val loginProfileUIState: StateFlow<LoginProfileUIState> = loginProfileUiState(
        userState = userRepository.userState
    ).stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = LoginProfileUIState.Error("Loading..."),
    )

    suspend fun fetchAccessData() {
        userRepository.fetchLogin()
        terminalConfigRepository.fetchConfig()
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
                            LoginProfileUIState.LoggedIn(
                                username = state.user.login,
                                role = state.user.active_role_name
                            )
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