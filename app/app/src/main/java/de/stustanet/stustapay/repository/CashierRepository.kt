package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.CashierStocking
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.CashierRemoteDataSource
import javax.inject.Inject

class CashierRepository @Inject constructor(
    private val cashierRemoteDataSource: CashierRemoteDataSource
) {
    suspend fun getCashierStockings(): Response<List<CashierStocking>> {
        return cashierRemoteDataSource.getCashierStockings()
    }

    suspend fun equipCashier(tagUid: ULong, stockingId: ULong): Response<Unit> {
        return cashierRemoteDataSource.equipCashier(tagUid, stockingId)
    }
}