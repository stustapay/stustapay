package de.stustapay.stustapay.netsource

import de.stustapay.stustapay.model.AccountChange
import de.stustapay.stustapay.model.CashRegister
import de.stustapay.stustapay.model.CashierEquip
import de.stustapay.stustapay.model.CashierStocking
import de.stustapay.stustapay.model.TransferCashRegisterPayload
import de.stustapay.stustapay.model.TransportAccountChange
import de.stustapay.stustapay.model.UserInfo
import de.stustapay.stustapay.model.UserInfoPayload
import de.stustapay.stustapay.model.UserTag
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
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

    suspend fun getUserInfo(tagId: ULong): Response<UserInfo> {
        return terminalAPI.getUserInfo(UserInfoPayload(tagId))
    }

    suspend fun transferCashRegister(
        sourceTag: UserTag,
        targetTag: UserTag
    ): Response<CashRegister> {
        return terminalAPI.transferCashRegister(
            TransferCashRegisterPayload(
                source_cashier_tag_uid = sourceTag.uid,
                target_cashier_tag_uid = targetTag.uid,
            )
        )
    }

    suspend fun getRegisters(): Response<List<CashRegister>> {
        return terminalAPI.listRegisters()
    }
}