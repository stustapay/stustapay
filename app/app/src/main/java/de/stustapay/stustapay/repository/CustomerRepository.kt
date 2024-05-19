package de.stustapay.stustapay.repository

import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.api.models.Account
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.netsource.CustomerRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CustomerRepository @Inject constructor(
    private val customerRemoteDataSource: CustomerRemoteDataSource
) {
    suspend fun getCustomer(id: BigInteger): Response<Account> {
        return customerRemoteDataSource.getCustomer(id)
    }

    suspend fun grantFreeTicket(tag: NfcTag, vouchers: UInt = 0u): Response<Account> {
        return customerRemoteDataSource.grantFreeTicket(tag, vouchers)
    }

    suspend fun grantVouchers(tag: NfcTag, vouchers: UInt): Response<Account> {
        return customerRemoteDataSource.grantVouchers(tag, vouchers)
    }

    suspend fun switchTag(oldTag: NfcTag, newTag: NfcTag, comment: String): Response<Unit> {
        return customerRemoteDataSource.switchTag(oldTag, newTag, comment)
    }
}