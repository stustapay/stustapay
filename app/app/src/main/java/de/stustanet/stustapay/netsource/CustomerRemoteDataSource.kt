package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.Account
import de.stustanet.stustapay.model.GrantVouchers
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class CustomerRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun getCustomer(id: ULong): Response<Account> {
        return terminalAPI.getCustomer(id)
    }

    suspend fun grantVouchers(id: ULong, vouchers: Int): Response<Account> {
        return terminalAPI.grantVouchers(GrantVouchers(vouchers, id))
    }
}