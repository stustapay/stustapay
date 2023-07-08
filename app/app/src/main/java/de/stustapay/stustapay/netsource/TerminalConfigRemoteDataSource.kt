package de.stustapay.stustapay.netsource

import de.stustapay.stustapay.model.TerminalConfig
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import javax.inject.Inject

class TerminalConfigRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
){
    suspend fun getTerminalConfig(): Response<TerminalConfig> {
        return terminalAPI.getTerminalConfig()
    }
}