package de.stustapay.stustapay.repository

import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.api.models.EntryScanResult
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.netsource.EntryRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EntryRepository @Inject constructor(
    private val entryRemoteDataSource: EntryRemoteDataSource
) {
    suspend fun scanEntry(tagUid: BigInteger): Response<EntryScanResult> {
        return entryRemoteDataSource.scanEntry(tagUid)
    }
}
