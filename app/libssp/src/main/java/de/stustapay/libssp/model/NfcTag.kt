package de.stustapay.libssp.model

import com.ionspin.kotlin.bignum.integer.BigInteger

data class NfcTag(
    val uid: BigInteger,
    val pin: String?,
) {
    override fun toString(): String {
        val uidHex = uidHex()
        return if (pin == null) {
            uidHex
        } else {
            "$uidHex: $pin"
        }
    }

    fun uidHex(): String {
        return uid.toString(16).uppercase()
    }
}