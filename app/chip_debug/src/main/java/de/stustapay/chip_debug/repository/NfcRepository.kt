package de.stustapay.chip_debug.repository

import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanRequest
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.api.models.UserTagSecret
import de.stustapay.libssp.nfc.NfcDataSource
import de.stustapay.libssp.util.BitVector
import de.stustapay.libssp.util.bv
import de.stustapay.libssp.util.decodeHex
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

sealed interface ReadMode {
    object Fast : ReadMode
    data class Full(val auth: Boolean, val cmac: Boolean) : ReadMode
}

@Singleton
class NfcRepository @Inject constructor(
    private val nfcDataSource: NfcDataSource
) {
    // nfc communication secret keys
    private val uidRetrKey =
        MutableStateFlow<BitVector?>(0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv)
    private val dataProtKey =
        MutableStateFlow<BitVector?>(0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv)

    val tagContent = "StuStaPay - built by SSN & friends!\nglhf ;)\n"

    fun setTagKeys(secrets: UserTagSecret) {
        uidRetrKey.update { secrets.key1.decodeHex() }
        dataProtKey.update { secrets.key0.decodeHex() }
    }

    suspend fun read(mode: ReadMode): NfcScanResult {
        val key = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return when (mode) {
            is ReadMode.Fast -> {
                nfcDataSource.scan(NfcScanRequest.FastRead(key, dataProtKey.value))
            }

            is ReadMode.Full -> {
                nfcDataSource.scan(NfcScanRequest.Read(mode.auth, mode.cmac, key))
            }
        }
    }

    suspend fun readMultiKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        val keys = listOf(BitVector(128uL), BitVector(128uL), key)
        return nfcDataSource.scan(NfcScanRequest.ReadMultiKey(auth, cmac, keys))
    }

    suspend fun writeSig(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteSig(auth, cmac, key, tagContent))
    }

    suspend fun writeKey(auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteKey(auth, cmac, key))
    }

    suspend fun writeProtect(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteProtect(enable, auth, cmac, key))
    }

    suspend fun writeCmac(enable: Boolean, auth: Boolean, cmac: Boolean): NfcScanResult {
        val key = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.WriteCmac(enable, auth, cmac, key))
    }

    suspend fun test(): NfcScanResult {
        val k0 = dataProtKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        val k1 = uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
        return nfcDataSource.scan(NfcScanRequest.Test(k0, k1))
    }
}
