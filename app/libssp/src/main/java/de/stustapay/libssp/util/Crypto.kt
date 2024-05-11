package de.stustapay.libssp.util

import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

val IV = IvParameterSpec(ByteArray(16) { 0 })
val AES_CIPHER: Cipher = Cipher.getInstance("AES/CBC/NoPadding")

fun BitVector.aesEncrypt(key: BitVector): BitVector {
    val ck = SecretKeySpec(key.asByteArray(), "AES")
    AES_CIPHER.init(Cipher.ENCRYPT_MODE, ck, IV)
    return AES_CIPHER.doFinal(this.asByteArray()).asBitVector()
}

fun BitVector.aesDecrypt(key: BitVector): BitVector {
    val ck = SecretKeySpec(key.asByteArray(), "AES")
    AES_CIPHER.init(Cipher.DECRYPT_MODE, ck, IV)
    return AES_CIPHER.doFinal(this.asByteArray()).asBitVector()
}

fun BitVector.cmac(k: BitVector): BitVector {
    if (this.len == 0uL) { throw IllegalArgumentException() }
    if (k.len != 16uL * 8uL) { throw IllegalArgumentException() }

    val l = BitVector(16uL * 8uL).aesEncrypt(k)
    val k1 = l.shl(1uL)
    if (l.msb()) {
        k1.sbe(15uL, k1.gbe(15uL) xor 0x87u)
    }
    val k2 = k1.shl(1uL)
    if (k1.msb()) {
        k2.sbe(15uL, k2.gbe(15uL) xor 0x87u)
    }

    val padLen = ((this.len - 1uL) / (16uL * 8uL) + 1uL) * 16uL * 8uL
    var pad = this
    if (padLen != this.len) {
        val one = BitVector(1uL)
        one[0uL] = true
        pad += one
        pad += BitVector(padLen - pad.len)
    }

    var ci = BitVector(16uL * 8uL)
    for (i in 0uL until pad.len / (16uL * 8uL) - 1uL) {
        ci = ci.xor(pad.slice(pad.len - (i + 1uL) * 16uL * 8uL, pad.len - i * 16uL * 8uL)).aesEncrypt(k)
    }

    ci = if (pad.len == this.len) {
        ci.xor(k1)
    } else {
        ci.xor(k2)
    }
    ci = ci.xor(pad.slice(0uL, 16uL * 8uL)).aesEncrypt(k)

    return ci
}