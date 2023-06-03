package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.AccountChange
import de.stustanet.stustapay.model.CashRegister
import de.stustanet.stustapay.model.CashierEquip
import de.stustanet.stustapay.model.CashierStocking
import de.stustanet.stustapay.model.TransferCashRegisterPayload
import de.stustanet.stustapay.model.TransportAccountChange
import de.stustanet.stustapay.model.UserInfo
import de.stustanet.stustapay.model.UserInfoPayload
import de.stustanet.stustapay.model.UserTag
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