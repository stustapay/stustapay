package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.TerminalConfigState
import de.stustanet.stustapay.model.TillButton
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.TerminalConfigRemoteDataSource
import de.stustanet.stustapay.ui.order.TillProductButtonUI
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TerminalConfigRepository @Inject constructor(
    private val terminalConfigRemoteDataSource: TerminalConfigRemoteDataSource,
) {
    var terminalConfigState = MutableStateFlow<TerminalConfigState>(TerminalConfigState.Loading)

    suspend fun fetchConfig() {
        when (val response = terminalConfigRemoteDataSource.getTerminalConfig()) {
            is Response.OK -> {
                terminalConfigState.emit(TerminalConfigState.Success(response.data))
            }
            is Response.Error -> {
                terminalConfigState.emit(TerminalConfigState.Error(response.msg()))
            }
        }
    }
}
