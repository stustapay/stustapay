package de.stustapay.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.repository.InfallibleRepository
import de.stustapay.stustapay.repository.InfallibleState
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

sealed interface BorderState {
    object NoBorder : BorderState
    data class Border(val msg: String) : BorderState
}

@HiltViewModel
class RootWrapperViewModel @Inject constructor(
    terminalConfigRepository: TerminalConfigRepository,
    infallibleRepository: InfallibleRepository,
) : ViewModel() {
    // updates to this are triggered by any config-fetch, e.g. from rootview refresh button.

    val borderState = terminalConfigRepository.terminalConfigState.mapState(
        BorderState.NoBorder,
        viewModelScope
    ) { state ->
        when (state) {
            is TerminalConfigState.NoConfig -> {
                BorderState.Border("no terminal configuration")
            }

            is TerminalConfigState.Error -> {
                BorderState.Border("config error: ${state.message}")
            }

            is TerminalConfigState.Success -> {
                if (state.config.testMode) {
                    BorderState.Border(state.config.testModeMessage)
                } else {
                    BorderState.NoBorder
                }
            }
        }
    }

    val infallibleVisible = infallibleRepository.state.map {
        it !is InfallibleState.Hide
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )
}

