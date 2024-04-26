package de.stustapay.stustapay.repository

import de.stustapay.api.models.CashRegister
import de.stustapay.api.models.CashRegisterStocking
import de.stustapay.api.models.UserInfo
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.netsource.CashierRemoteDataSource
import javax.inject.Inject

class CashierRepository @Inject constructor(
    private val cashierRemoteDataSource: CashierRemoteDataSource
) {
    suspend fun getCashierStockings(): Response<List<CashRegisterStocking>> {
        return cashierRemoteDataSource.getCashierStockings()
    }

    suspend fun equipCashier(tagid: ULong, registerId: ULong, stockingId: ULong): Response<Unit> {
        return cashierRemoteDataSource.equipCashier(tagid, registerId, stockingId)
    }

    suspend fun bookTransport(cashierTagId: ULong, amount: Double): Response<Unit> {
        return cashierRemoteDataSource.bookTransport(cashierTagId, amount)
    }

    suspend fun bookVault(orgaTagId: ULong, amount: Double): Response<Unit> {
        return cashierRemoteDataSource.bookVault(orgaTagId, amount)
    }

    suspend fun getUserInfo(tagId: ULong): Response<UserInfo> {
        return cashierRemoteDataSource.getUserInfo(tagId)
    }

    suspend fun transferCashRegister(sourceTag: UserTag, targetTag: UserTag): Response<CashRegister> {
        return cashierRemoteDataSource.transferCashRegister(sourceTag, targetTag)
    }

    suspend fun getRegisters(): Response<List<CashRegister>> {
        return cashierRemoteDataSource.getRegisters()
    }
}