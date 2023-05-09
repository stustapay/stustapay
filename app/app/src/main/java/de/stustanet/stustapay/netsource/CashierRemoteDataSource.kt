package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class CashierRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun getCashierStockings(): Response<List<CashierStocking>> {
        return terminalAPI.getCashierStockings()
    }

    suspend fun equipCashier(tagId: ULong, registerId: ULong, stockingId: ULong): Response<Unit> {
        return terminalAPI.equipCashier(CashierEquip(tagId, registerId, stockingId))
    }

    suspend fun bookTransport(cashierTagId: ULong, amount: Double): Response<Unit> {
        return terminalAPI.bookTransport(AccountChange(cashierTagId, amount))
    }

    suspend fun bookVault(orgaTagId: ULong, amount: Double): Response<Unit> {
        return terminalAPI.bookVault(TransportAccountChange(orgaTagId, amount))
    }

    suspend fun getCashierInfo(tagId: ULong): Response<UserInfo> {
        return terminalAPI.getCashierInfo(UserInfoPayload(tagId))
    }

    suspend fun getRegisters(): Response<List<CashRegister>> {
        return terminalAPI.listRegisters()
    }
}