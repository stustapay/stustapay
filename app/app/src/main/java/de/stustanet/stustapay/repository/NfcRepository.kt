package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.NewOrder
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
    suspend fun read(): NfcScanResult {
        return nfcDataSource.read()
    }

    suspend fun writeSig(): NfcScanResult {
        return nfcDataSource.writeSig()
    }

    suspend fun writeKey(): NfcScanResult {
        return nfcDataSource.writeKey()
    }

    suspend fun writeProtect(enable: Boolean): NfcScanResult {
        return nfcDataSource.writeProtect(enable)
    }

    suspend fun writeCmac(enable: Boolean): NfcScanResult {
        return nfcDataSource.writeCmac(enable)
    }
}