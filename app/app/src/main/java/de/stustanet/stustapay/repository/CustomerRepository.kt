package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.Account
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

    suspend fun grantVouchers(id: ULong, vouchers: Int): Response<Account> {
        return customerRemoteDataSource.grantVouchers(id, vouchers)
    }

    suspend fun switchTag(customerId: ULong, newTagId: ULong): Response<Unit> {
        return customerRemoteDataSource.switchTag(customerId, newTagId)
    }
}