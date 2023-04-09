package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.NfcScanRequest
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.model.PendingOrder
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.nfc.NfcDataSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcRepository @Inject constructor(
    private val nfcDataSource: NfcDataSource
) {
    suspend fun read(auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.Read(auth, cmac))
    }

    suspend fun writeSig(auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteSig(auth, cmac))
    }

    suspend fun writeKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteKey(auth, cmac))
    }

    suspend fun writeProtect(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteProtect(enable, auth, cmac))
    }

    suspend fun writeCmac(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteCmac(enable, auth, cmac))
    }
}