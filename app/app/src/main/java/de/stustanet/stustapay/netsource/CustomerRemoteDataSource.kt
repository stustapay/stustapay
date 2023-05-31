package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.Account
import de.stustanet.stustapay.model.GrantVouchers
import de.stustanet.stustapay.model.NewFreeTicketGrant
import de.stustanet.stustapay.model.SwitchTag
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class CustomerRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun getCustomer(id: ULong): Response<Account> {
        return terminalAPI.getCustomer(id)
    }

    suspend fun grantFreeTicket(tag: UserTag, vouchers: UInt = 0u): Response<Account> {
        return terminalAPI.grantFreeTicket(NewFreeTicketGrant(
            user_tag_uid = tag.uid,
            initial_voucher_amount = vouchers
        ))
    }

    suspend fun grantVouchers(tag: UserTag, vouchers: UInt): Response<Account> {
        return terminalAPI.grantVouchers(GrantVouchers(vouchers, tag.uid))
    }

    suspend fun switchTag(customerID: ULong, newTag: ULong, comment: String): Response<Unit> {
        return terminalAPI.switchTag(SwitchTag(customerID, newTag, comment))
    }
}