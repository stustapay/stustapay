package de.stustapay.stustapay.netsource

import de.stustapay.api.models.TerminalConfig
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

class TerminalConfigRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
){
    suspend fun getTerminalConfig(): Response<TerminalConfig> {
        return terminalApiAccessor.execute { it.base().config() }
    }
}