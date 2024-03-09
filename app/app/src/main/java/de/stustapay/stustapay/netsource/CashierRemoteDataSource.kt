package de.stustapay.stustapay.netsource

import de.stustapay.api.models.CashRegisterStocking
import de.stustapay.api.models.CashierAccountChangePayload
import de.stustapay.api.models.RegisterStockUpPayload
import de.stustapay.api.models.TransportAccountChangePayload
import de.stustapay.api.models.CashRegister
import de.stustapay.api.models.TransferCashRegisterPayload
import de.stustapay.api.models.UserInfo
import de.stustapay.stustapay.model.UserTag
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import de.stustapay.stustapay.net.TerminalApiAccessor
import de.stustapay.api.models.UserInfoPayload
import de.stustapay.stustapay.net.execute
import javax.inject.Inject

class CashierRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI, private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun getCashierStockings(): Response<List<CashRegisterStocking>> {
        return terminalApiAccessor.execute { it.base().listCashRegisterStockings() }
    }

    suspend fun equipCashier(tagId: ULong, registerId: Int, stockingId: Int): Response<Unit> {
        return terminalApiAccessor.execute {
            it.base().stockUpCashRegister(RegisterStockUpPayload(tagId, registerId, stockingId))
        }
    }

    suspend fun bookTransport(cashierTagId: ULong, amount: Double): Response<Unit> {
        return terminalApiAccessor.execute {
            it.cashier().changeCashRegisterBalance(
                CashierAccountChangePayload(cashierTagId, amount)
            )
        }
    }

    suspend fun bookVault(orgaTagId: ULong, amount: Double): Response<Unit> {
        return terminalApiAccessor.execute {
            it.cashier().changeTransportAccountBalance(
                TransportAccountChangePayload(orgaTagId, amount)
            )
        }
    }

    suspend fun getUserInfo(tagId: ULong): Response<UserInfo> {
        return terminalApiAccessor.execute { it.base().userInfo(UserInfoPayload(tagId)) }
    }

    suspend fun transferCashRegister(
        sourceTag: UserTag, targetTag: UserTag
    ): Response<CashRegister> {
        return terminalApiAccessor.execute {
            it.cashier().transferCashRegister(TransferCashRegisterPayload(sourceTag.uid, targetTag.uid))
        }
    }

    suspend fun getRegisters(): Response<List<CashRegister>> {
        return terminalApiAccessor.execute { it.base().listCashRegisters(hideAssigned = false) }
    }
}