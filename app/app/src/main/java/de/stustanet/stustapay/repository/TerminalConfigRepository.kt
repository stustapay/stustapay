package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.TerminalConfigState
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.TerminalConfigRemoteDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
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
                terminalConfigState.update { TerminalConfigState.Success(response.data) }
            }
            is Response.Error -> {
                terminalConfigState.update { TerminalConfigState.Error(response.msg()) }
            }
        }
    }
}
