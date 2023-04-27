package de.stustanet.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.User
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

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

    suspend fun fetchAccessData() {
        userRepository.fetchLogin()
        terminalConfigRepository.fetchConfig()
    }
}

class StartPageUiState(
    private val user: UserState = UserState.NoLogin,
    private val terminal: TerminalConfigState = TerminalConfigState.Loading
) {
    fun checkAccess(access: (User, TerminalConfig) -> Boolean): Boolean {
        return if (user is UserState.LoggedIn && terminal is TerminalConfigState.Success) {
            access(user.user, terminal.config)
        } else {
            false
        }
    }
}