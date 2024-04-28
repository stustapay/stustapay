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
        MutableStateFlow<BitVector?>(0x00.bv + 0x10.bv + 0x20.bv + 0x30.bv + 0x40.bv + 0x50.bv + 0x60.bv + 0x70.bv + 0x80.bv + 0x90.bv + 0xa0.bv + 0xb0.bv + 0xc0.bv + 0xd0.bv + 0xe0.bv + 0xf0.bv)
    private val dataProtKey =
        MutableStateFlow<BitVector?>(0x00.bv + 0x01.bv + 0x02.bv + 0x03.bv + 0x04.bv + 0x05.bv + 0x06.bv + 0x07.bv + 0x08.bv + 0x09.bv + 0x0a.bv + 0x0b.bv + 0x0c.bv + 0x0d.bv + 0x0e.bv + 0x0f.bv)

    val tagContent = "StuStaPay - built by SSN & friends!\nglhf ;)\n"

    fun setTagKeys(secrets: UserTagSecret) {
        uidRetrKey.update { secrets.key1.decodeHex() }
        dataProtKey.update { secrets.key0.decodeHex() }
    }

    suspend fun read(): NfcScanResult {
        return nfcDataSource.scan(
            NfcScanRequest.Read(
                uidRetrKey.value ?: return NfcScanResult.Fail(
                    NfcScanFailure.NoKey
                ), dataProtKey.value
            )
        )
    }

    suspend fun write(): NfcScanResult {
        return nfcDataSource.scan(
            NfcScanRequest.Write(
                uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey),
                dataProtKey.value
            )
        )
    }

    suspend fun test(): NfcScanResult {
        return nfcDataSource.scan(
            NfcScanRequest.Test(
                uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey),
                dataProtKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
            )
        )
    }
}
