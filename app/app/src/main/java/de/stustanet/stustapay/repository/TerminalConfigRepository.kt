package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.TerminalConfigRemoteDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton


/**
 * Terminal configuration including validity state.
 */
sealed interface TerminalConfigState {
    object NoConfig : TerminalConfigState

    data class Success(
        var config: TerminalConfig
    ) : TerminalConfigState

    data class Error(
        val message: String
    ) : TerminalConfigState
}

@Singleton
class TerminalConfigRepository @Inject constructor(
    private val terminalConfigRemoteDataSource: TerminalConfigRemoteDataSource,
) {
    private var _terminalConfigState =
        MutableStateFlow<TerminalConfigState>(TerminalConfigState.NoConfig)
    var terminalConfigState = _terminalConfigState.asStateFlow()

    suspend fun fetchConfig() {
        when (val response = terminalConfigRemoteDataSource.getTerminalConfig()) {
            is Response.OK -> {
                _terminalConfigState.update { TerminalConfigState.Success(response.data) }
            }
            is Response.Error -> {
                _terminalConfigState.update { TerminalConfigState.Error(response.msg()) }
            }
        }
    }
}
