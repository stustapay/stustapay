package de.stustapay.libssp.model

import com.ionspin.kotlin.bignum.integer.BigInteger

data class NfcTag(
    val uid: BigInteger,
    val pin: String?
)