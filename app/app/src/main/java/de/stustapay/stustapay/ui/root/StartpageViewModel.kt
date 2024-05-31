package de.stustapay.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.libssp.util.Result
import de.stustapay.libssp.util.asResult
import de.stustapay.stustapay.repository.InfallibleRepository
import kotlinx.coroutines.flow.*
import javax.inject.Inject


@HiltViewModel
class StartpageViewModel @Inject constructor(
    userRepository: UserRepository,
    terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {

    val configLoading = terminalConfigRepository.fetching.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )

    val uiState = combine(
        userRepository.userState,
        terminalConfigRepository.terminalConfigState
    ) { user, terminal ->
        TerminalLoginState(user, terminal)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = TerminalLoginState(),
    )
}