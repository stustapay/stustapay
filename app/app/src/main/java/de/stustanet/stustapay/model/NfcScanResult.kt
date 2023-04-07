package de.stustanet.stustapay.model

sealed interface NfcScanResult {
    data class Read(
        val chipProtected: Boolean,
        val chipUid: ULong,
        val chipContent: String
    ): NfcScanResult
    object Write: NfcScanResult
    data class Fail(
        val reason: NfcScanFailure
    ): NfcScanResult
}

sealed interface NfcScanFailure {
    object Other: NfcScanFailure
    object Incompatible: NfcScanFailure
    object Lost: NfcScanFailure
    object Auth: NfcScanFailure
}