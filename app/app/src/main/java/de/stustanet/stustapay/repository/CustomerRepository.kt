package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.Account
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.CustomerRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CustomerRepository @Inject constructor(
    private val customerRemoteDataSource: CustomerRemoteDataSource
) {
    suspend fun getCustomer(id: ULong): Response<Account> {
        return customerRemoteDataSource.getCustomer(id)
    }

    suspend fun grantFreeTicket(tag: UserTag, vouchers: UInt = 0u): Response<Account> {
        return customerRemoteDataSource.grantFreeTicket(tag, vouchers)
    }

    suspend fun grantVouchers(tag: UserTag, vouchers: UInt): Response<Account> {
        return customerRemoteDataSource.grantVouchers(tag, vouchers)
    }

    suspend fun switchTag(customerID: ULong, newTag: ULong, comment: String): Response<Unit> {
        return customerRemoteDataSource.switchTag(customerID, newTag, comment)
    }
}