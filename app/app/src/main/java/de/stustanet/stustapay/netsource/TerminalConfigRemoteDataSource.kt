package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class TerminalConfigRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
){
    suspend fun getTerminalConfig(): Response<TerminalConfig> {
        return terminalAPI.getTerminalConfig()
    }
}