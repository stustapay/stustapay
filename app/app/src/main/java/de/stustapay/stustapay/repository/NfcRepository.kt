package de.stustapay.stustapay.repository

import de.stustapay.api.models.UserTagSecret
import de.stustapay.libssp.model.NfcScanRequest
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.nfc.NfcDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcRepository @Inject constructor(
    private val nfcDataSource: NfcDataSource
) {
    fun setTagKeys(_secrets: UserTagSecret) {
        // Kept as a compatibility hook for terminal config refreshes. Fast scans are raw UID-only.
    }

    suspend fun read(): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.FastRead)
    }
}
