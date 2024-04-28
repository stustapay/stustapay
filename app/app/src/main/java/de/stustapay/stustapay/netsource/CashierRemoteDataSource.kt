package de.stustapay.stustapay.netsource

import com.ionspin.kotlin.bignum.integer.BigInteger
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.CashRegisterStocking
import de.stustapay.api.models.CashierAccountChangePayload
import de.stustapay.api.models.RegisterStockUpPayload
import de.stustapay.api.models.TransportAccountChangePayload
import de.stustapay.api.models.CashRegister
import de.stustapay.api.models.TransferCashRegisterPayload
import de.stustapay.api.models.UserInfo
import de.stustapay.api.models.UserInfoPayload
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

class CashierRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun getCashierStockings(): Response<List<CashRegisterStocking>> {
        return terminalApiAccessor.execute { it.base()?.listCashRegisterStockings() }
    }

    suspend fun equipCashier(tagId: ULong, registerId: ULong, stockingId: ULong): Response<Unit> {
        return terminalApiAccessor.execute {
            it.base()?.stockUpCashRegister(RegisterStockUpPayload(tagId.toBigInteger(), registerId.toBigInteger(), stockingId.toBigInteger()))
        }
    }

    suspend fun bookTransport(cashierTagId: ULong, amount: Double): Response<Unit> {
        return terminalApiAccessor.execute {
            it.cashier()?.changeCashRegisterBalance(
                CashierAccountChangePayload(cashierTagId.toBigInteger(), amount)
            )
        }
    }

    suspend fun bookVault(orgaTagId: ULong, amount: Double): Response<Unit> {
        return terminalApiAccessor.execute {
            it.cashier()?.changeTransportAccountBalance(
                TransportAccountChangePayload(orgaTagId.toBigInteger(), amount)
            )
        }
    }

    suspend fun getUserInfo(tag: NfcTag): Response<UserInfo> {
        return terminalApiAccessor.execute { it.base()?.userInfo(UserInfoPayload(tag.uid)) }
    }

    suspend fun transferCashRegister(
        sourceTag: NfcTag, targetTag: NfcTag
    ): Response<CashRegister> {
        return terminalApiAccessor.execute {
            it.cashier()?.transferCashRegister(TransferCashRegisterPayload(sourceTag.uid, targetTag.uid))
        }
    }

    suspend fun getRegisters(): Response<List<CashRegister>> {
        return terminalApiAccessor.execute { it.base()?.listCashRegisters(hideAssigned = false) }
    }
}