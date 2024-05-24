package de.stustapay.stustapay.netsource

import com.ionspin.kotlin.bignum.integer.BigInteger
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.Account
import de.stustapay.api.models.GrantVoucherPayload
import de.stustapay.api.models.NewFreeTicketGrant
import de.stustapay.api.models.Order
import de.stustapay.api.models.SwitchTagPayload
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

class CustomerRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun getCustomer(id: BigInteger): Response<Account> {
        return terminalApiAccessor.execute { it.customer()?.getCustomer(id) }
    }

    suspend fun getCustomerOrders(id: BigInteger): Response<List<Order>> {
        return terminalApiAccessor.execute { it.customer()?.getCustomerOrders(id) }
    }

    suspend fun grantFreeTicket(
        tag: NfcTag, vouchers: UInt = 0u
    ): Response<Account> {
        return terminalApiAccessor.execute {
            it.user()?.grantFreeTicket(
                NewFreeTicketGrant(
                    userTagUid = tag.uid,
                    userTagPin = tag.pin ?: return@execute null,
                    initialVoucherAmount = vouchers.toBigInteger()
                )
            )
        }
    }

    suspend fun grantVouchers(tag: NfcTag, vouchers: UInt): Response<Account> {
        return terminalApiAccessor.execute {
            it.user()?.grantVouchers(
                GrantVoucherPayload(
                    userTagUid = tag.uid, vouchers = vouchers.toBigInteger()
                )
            )
        }
    }

    suspend fun switchTag(oldTag: NfcTag, newTag: NfcTag, comment: String): Response<Unit> {
        return terminalApiAccessor.execute {
            it.customer()?.switchTag(
                SwitchTagPayload(
                    oldUserTagPin = oldTag.pin ?: return@execute null,
                    newUserTagUid = newTag.uid,
                    newUserTagPin = newTag.pin ?: return@execute null,
                    comment = comment
                )
            )
        }
    }
}