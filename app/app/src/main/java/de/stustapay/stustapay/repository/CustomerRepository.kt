package de.stustapay.stustapay.repository

import de.stustapay.api.models.Account
import de.stustapay.api.models.Customer
import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.netsource.CustomerRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CustomerRepository @Inject constructor(
    private val customerRemoteDataSource: CustomerRemoteDataSource
) {
    suspend fun getCustomer(id: ULong): Response<Customer> {
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