package de.stustapay.stustapay.repository

import de.stustapay.api.models.UserTagSecret
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanRequest
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.nfc.NfcDataSource
import de.stustapay.libssp.util.BitVector
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
    private val uidRetrKey = MutableStateFlow<BitVector?>(null)
    private val dataProtKey = MutableStateFlow<BitVector?>(null)

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
}
