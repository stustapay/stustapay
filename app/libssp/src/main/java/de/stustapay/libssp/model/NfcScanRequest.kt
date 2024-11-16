package de.stustapay.libssp.model

import de.stustapay.libssp.util.BitVector

sealed interface NfcScanRequest {
    data class Read(
        val uidRetrKey: BitVector,
        val dataProtKey: BitVector?
    ) : NfcScanRequest

    data class Write(
        val uidRetrKey: BitVector,
        val dataProtKey: BitVector?
    ) : NfcScanRequest

    data class Rewrite(
        val uidRetrKey: BitVector,
        val dataProtKey: BitVector,
        val oldDataProtKey: BitVector
    ) : NfcScanRequest

    data class Test(
        val uidRetrKey: BitVector,
        val dataProtKey: BitVector
    ) : NfcScanRequest
}