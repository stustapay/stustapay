package de.stustanet.stustapay.model

sealed interface NfcScanRequest {
    data class Read(
        val auth: Boolean,
        val cmac: Boolean
    ): NfcScanRequest

    data class WriteSig(
        val auth: Boolean,
        val cmac: Boolean
    ): NfcScanRequest

    data class WriteKey(
        val auth: Boolean,
        val cmac: Boolean
    ): NfcScanRequest

    data class WriteProtect(
        val enable: Boolean,
        val auth: Boolean,
        val cmac: Boolean
    ): NfcScanRequest

    data class WriteCmac(
        val enable: Boolean,
        val auth: Boolean,
        val cmac: Boolean
    ): NfcScanRequest
}