package de.stustapay.stustapay.netsource

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.Account
import de.stustapay.api.models.Customer
import de.stustapay.api.models.GrantVoucherPayload
import de.stustapay.api.models.NewFreeTicketGrant
import de.stustapay.api.models.SwitchTagPayload
import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import de.stustapay.stustapay.net.execute
import javax.inject.Inject

class CustomerRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun getCustomer(id: ULong): Response<Customer> {
        return terminalApiAccessor.execute { it.customer().getCustomer(id.toBigInteger()) }
    }

    suspend fun grantFreeTicket(
        tag: UserTag,
        vouchers: UInt = 0u
    ): Response<Account> {
        return terminalApiAccessor.execute {
            it.user().grantFreeTicket(
                NewFreeTicketGrant(
                    userTagUid = tag.uid,
                    initialVoucherAmount = vouchers.toBigInteger()
                )
            )
        }
    }

    suspend fun grantVouchers(tag: UserTag, vouchers: UInt): Response<Account> {
        return terminalApiAccessor.execute {
            it.user().grantVouchers(
                GrantVoucherPayload(
                    userTagUid = tag.uid,
                    vouchers = vouchers.toBigInteger()
                )
            )
        }
    }

    suspend fun switchTag(customerID: ULong, newTag: ULong, comment: String): Response<Unit> {
        return terminalApiAccessor.execute {
            it.customer().switchTag(
                SwitchTagPayload(
                    customerId = customerID.toBigInteger(),
                    newUserTagUid = newTag.toBigInteger(),
                    comment = comment
                )
            )
        }
    }
}