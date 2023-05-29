package de.stustanet.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.util.mapState
import javax.inject.Inject

sealed interface BorderState {
    object NoBorder : BorderState
    data class Border(val msg: String) : BorderState
}

@HiltViewModel
class RootWrapperViewModel @Inject constructor(
    terminalConfigRepository: TerminalConfigRepository
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
                BorderState.Border("config error")
            }

            is TerminalConfigState.Success -> {
                if (state.config.test_mode) {
                    BorderState.Border(state.config.test_mode_message)
                } else {
                    BorderState.NoBorder
                }
            }
        }
    }
}

