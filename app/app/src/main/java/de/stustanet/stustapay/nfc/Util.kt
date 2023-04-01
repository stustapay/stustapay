package de.stustanet.stustapay.nfc

import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.experimental.or
import kotlin.experimental.xor

fun printByte(b: Byte) {
    val upperNibble = ((b.toInt() and 0xf0) shr 4).toByte()
    val lowerNibble = (b.toInt() and 0x0f).toByte()
    val chars = "0123456789abcdef"
    print(chars[upperNibble.toInt()])
    print(chars[lowerNibble.toInt()])
}

fun printByteArray(a: ByteArray) {
    print("[")
    printByte(a[0])
    for (i in 1 until a.size) {
        print(", ")
        printByte(a[i])
    }
    print("]")
}

fun msb(b: Byte): Boolean {
    return b.toInt() and 0x80 != 0
}

fun msb(a: ByteArray): Boolean {
    return msb(a[0])
}

fun xor(a: ByteArray, b: ByteArray): ByteArray {
    if (a.size != b.size) { throw IllegalArgumentException() }
    val ret = ByteArray(a.size)
    for (i in a.indices) {
        ret[i] = a[i] xor b[i]
    }
    return ret
}

fun shl(a: ByteArray): ByteArray {
    val ret = ByteArray(a.size)
    var msb = false;
    for (i in a.indices) {
        ret[a.size - 1 - i] = (a[a.size - 1 - i].toInt() shl 1).toByte()
        if (msb) {
            ret[a.size - 1 - i] = ret[a.size - 1 - i] or 0x01;
        }
        msb = a[a.size - 1 - i].toInt() and 0x80 != 0
    }
    return ret
}

fun cmac(k: ByteArray, m: ByteArray): ByteArray {
    if (m.isEmpty()) { throw IllegalArgumentException() }
    if (k.size != 16) { throw IllegalArgumentException() }

    val ck = SecretKeySpec(k, "AES")
    val c = Cipher.getInstance("AES/CBC/NoPadding")
    val iv = ByteArray(16) { 0 }

    c.init(Cipher.ENCRYPT_MODE, ck, IvParameterSpec(iv))
    val l = c.doFinal(ByteArray(16) { 0 })
    val k1 = shl(l)
    if (msb(l)) {
        k1[15] = k1[15] xor 0x87.toByte()
    }
    val k2 = shl(k1)
    if (msb(k1)) {
        k2[15] = k2[15] xor 0x87.toByte()
    }

    val pad = ByteArray(((m.size - 1) / 16 + 1) * 16) { 0 }
    for (i in m.indices) { pad[i] = m[i] }
    if (pad.size != m.size) {
        pad[m.size] = 0x80.toByte()
    }

    var ci = ByteArray(16) { 0 }
    for (i in 0 until pad.size / 16 - 1) {
        c.init(Cipher.ENCRYPT_MODE, ck, IvParameterSpec(iv))
        ci = c.doFinal(xor(ci, pad.sliceArray(i * 16 until (i + 1) * 16)))
    }

    ci = if (pad.size == m.size) {
        xor(ci, k1)
    } else {
        xor(ci, k2)
    }
    c.init(Cipher.ENCRYPT_MODE, ck, IvParameterSpec(iv))
    ci = c.doFinal(xor(ci, pad.sliceArray(pad.size - 16 until pad.size)))

    return ci
}