package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.Account
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class CustomerRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun getCustomer(id: ULong): Response<Account> {
        return terminalAPI.getCustomer(id)
    }
}