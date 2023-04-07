package de.stustanet.stustapay.model

sealed interface NfcScanResult {
    data class Read(
        val chipCompatible: Boolean,
        val chipAuthenticated: Boolean,
        val chipProtected: Boolean,
        val chipUid: ULong,
        val chipContent: String
    ): NfcScanResult
    object Write: NfcScanResult
    object Failed: NfcScanResult
}