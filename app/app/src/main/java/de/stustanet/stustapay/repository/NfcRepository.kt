package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanRequest
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.model.UserTagSecret
import de.stustanet.stustapay.nfc.NfcDataSource
import de.stustanet.stustapay.util.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcRepository @Inject constructor(
    private val nfcDataSource: NfcDataSource
) {
    // nfc communication secret keys
    private val key0 = MutableStateFlow<BitVector?>(null)
    private val key1 = MutableStateFlow<BitVector?>(null)

    val tagContent = "StuStaPay - built by SSN & friends!\nglhf ;)\n"

    fun setTagKeys(secrets: UserTagSecret) {
        key0.update { secrets.key0.decodeHex() }
        key1.update { secrets.key1.decodeHex() }
    }

    suspend fun read(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.Read(auth, cmac, key))
    }

    suspend fun readMultiKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        val keys = listOf(BitVector(128uL), BitVector(128uL), key)
        return nfcDataSource.scan(NfcScanRequest.ReadMultiKey(auth, cmac, keys))
    }

    suspend fun writeSig(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteSig(auth, cmac, key, tagContent))
    }

    suspend fun writeKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteKey(auth, cmac, key))
    }

    suspend fun writeProtect(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteProtect(enable, auth, cmac, key))
    }

    suspend fun writeCmac(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteCmac(enable, auth, cmac, key))
    }

    suspend fun test(): NfcScanResult {
        val k0 = key0.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        val k1 = key1.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.Test(k0, k1))
    }
}
