package de.stustapay.chip_debug.repository

import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanRequest
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.nfc.NfcDataSource
import de.stustapay.libssp.util.BitVector
import de.stustapay.libssp.util.decodeHex
import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton


@Singleton
class NfcRepository @Inject constructor(
    private val nfcDataSource: NfcDataSource
) {
    private val uidRetrKey =
        MutableStateFlow<BitVector?>("000102030405060708090a0b0c0d0e0f".decodeHex())
    private val dataProtKey =
        MutableStateFlow<BitVector?>("000102030405060708090a0b0c0d0e0f".decodeHex())
    private val oldDataProtKey =
        MutableStateFlow<BitVector?>("000102030405060708090a0b0c0d0e0f".decodeHex())

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

    suspend fun rewrite(): NfcScanResult {
        return nfcDataSource.scan(
            NfcScanRequest.Rewrite(
                uidRetrKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey),
                dataProtKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey),
                oldDataProtKey.value ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
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
