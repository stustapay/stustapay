package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.CashierEquip
import de.stustanet.stustapay.model.CashierStocking
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class CashierRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun getCashierStockings(): Response<List<CashierStocking>> {
        return terminalAPI.getCashierStockings()
    }

    suspend fun equipCashier(tagUid: ULong, stockingId: ULong): Response<Unit> {
        return terminalAPI.equipCashier(CashierEquip(tagUid, stockingId))
    }
}