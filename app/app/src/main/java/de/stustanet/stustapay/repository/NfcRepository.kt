package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.NfcScanRequest
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.nfc.NfcDataSource
import de.stustanet.stustapay.util.*
import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcRepository @Inject constructor(
    private val nfcDataSource: NfcDataSource
) {
    private val authKey = MutableStateFlow(ByteArray(16) { i -> i.toByte() }.asBitVector())

    suspend fun read(auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.Read(auth, cmac, authKey.value))
    }

    suspend fun readMultiKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        val keys = listOf(BitVector(128uL), BitVector(128uL), authKey.value)
        return nfcDataSource.scan(NfcScanRequest.ReadMultiKey(auth, cmac, keys))
    }

    suspend fun writeSig(auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteSig(auth, cmac, authKey.value))
    }

    suspend fun writeKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteKey(auth, cmac, authKey.value))
    }

    suspend fun writeProtect(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteProtect(enable, auth, cmac, authKey.value))
    }

    suspend fun writeCmac(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.WriteCmac(enable, auth, cmac, authKey.value))
    }

    suspend fun test(): NfcScanResult {
        return nfcDataSource.scan(NfcScanRequest.Test)
    }
}