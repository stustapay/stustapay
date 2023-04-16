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
    data class Test(
        val log: List<Pair<String, Boolean>>
    ): NfcScanResult
}

sealed interface NfcScanFailure {
    object Other: NfcScanFailure
    data class Incompatible(val msg: String): NfcScanFailure
    data class Lost(val msg: String): NfcScanFailure
    data class Auth(val msg: String): NfcScanFailure
}