package de.stustapay.libssp.model

sealed interface NfcScanResult {
    fun msg(): String
    data class Read(
        val tag: NfcTag
    ) : NfcScanResult {
        override fun msg(): String {
            return "read ${tag.uidHex()}"
        }
    }

    object Write : NfcScanResult {
        override fun msg(): String {
            return "write success"
        }
    }

    data class Fail(
        val reason: NfcScanFailure
    ) : NfcScanResult {
        override fun msg(): String {
            return "failed: $reason"
        }
    }

    data class Test(
        val log: List<Pair<String, Boolean>>
    ) : NfcScanResult {
        override fun msg(): String {
            return "got test results"
        }
    }
}

sealed interface NfcScanFailure {
    fun msg(): String

    object NoKey : NfcScanFailure {
        override fun msg(): String {
            return "No Key"
        }
    }

    data class Other(val msg: String) : NfcScanFailure {
        override fun msg(): String {
            return "other error: $msg"
        }
    }

    data class Incompatible(val msg: String) : NfcScanFailure {
        override fun msg(): String {
            return "incompatible: $msg"
        }
    }

    data class Lost(val msg: String) : NfcScanFailure {
        override fun msg(): String {
            return "tag lost: $msg"
        }
    }

    data class Auth(val msg: String) : NfcScanFailure {
        override fun msg(): String {
            return "auth fail: $msg"
        }
    }
}