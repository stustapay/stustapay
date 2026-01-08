package de.stustapay.stustapay.netsource

import de.stustapay.api.models.EntryScanPayload
import de.stustapay.api.models.EntryScanResult
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import com.ionspin.kotlin.bignum.integer.BigInteger
import javax.inject.Inject

class EntryRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun scanEntry(tagUid: BigInteger): Response<EntryScanResult> {
        return terminalApiAccessor.execute { it.entry()?.scanEntry(EntryScanPayload(tagUid = tagUid)) }
    }
}
