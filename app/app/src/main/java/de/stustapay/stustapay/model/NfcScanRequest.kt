package de.stustapay.stustapay.model

import de.stustapay.stustapay.util.BitVector

sealed interface NfcScanRequest {
    data class FastRead(
        val key: BitVector
    ): NfcScanRequest

    data class Read(
        val auth: Boolean,
        val cmac: Boolean,
        val key: BitVector
    ): NfcScanRequest

    data class ReadMultiKey(
        val auth: Boolean,
        val cmac: Boolean,
        val keys: List<BitVector>
    ): NfcScanRequest

    data class WriteSig(
        val auth: Boolean,
        val cmac: Boolean,
        val key: BitVector,
        val signature: String,
    ): NfcScanRequest

    data class WriteKey(
        val auth: Boolean,
        val cmac: Boolean,
        val key: BitVector
    ): NfcScanRequest

    data class WriteProtect(
        val enable: Boolean,
        val auth: Boolean,
        val cmac: Boolean,
        val key: BitVector
    ): NfcScanRequest

    data class WriteCmac(
        val enable: Boolean,
        val auth: Boolean,
        val cmac: Boolean,
        val key: BitVector
    ): NfcScanRequest

    data class Test(
        val key0: BitVector,
        val key1: BitVector
    ): NfcScanRequest
}