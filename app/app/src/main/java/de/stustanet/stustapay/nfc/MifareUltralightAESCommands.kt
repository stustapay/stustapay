package de.stustanet.stustapay.nfc

import android.nfc.tech.NfcA

const val PAGE_COUNT = 60
const val USER_BYTES = 144

fun cmdGetVersion(tag: NfcA): ByteArray {
    val cmd = ByteArray(1)
    cmd[0] = 0x60
    return tag.transceive(cmd)
}

fun cmdRead(page: Byte, tag: NfcA): ByteArray {
    if (page !in 0x00 until PAGE_COUNT) { throw Exception("Invalid parameters") }

    val cmd = ByteArray(2)
    cmd[0] = 0x30
    cmd[1] = page
    return tag.transceive(cmd)
}

fun cmdWrite(page: Byte, a: Byte, b: Byte, c: Byte, d: Byte, tag: NfcA) {
    if (page !in 0x00 until PAGE_COUNT) { throw Exception("Invalid parameters") }

    val cmd = ByteArray(6)
    cmd[0] = 0xa2.toByte()
    cmd[1] = page
    cmd[2] = a
    cmd[3] = b
    cmd[4] = c
    cmd[5] = d
    tag.transceive(cmd)
}

fun cmdAuthenticate1(type: Byte, tag: NfcA): ByteArray {
    if (type !in 0x00..0x02) { throw Exception("Invalid parameters") }

    val cmd = ByteArray(2)
    cmd[0] = 0x1a
    cmd[1] = type
    val resp = tag.transceive(cmd)
    return resp.drop(1).toByteArray()
}

fun cmdAuthenticate2(challenge: ByteArray, tag: NfcA): ByteArray {
    if (challenge.size != 32) { throw Exception("Invalid parameters") }

    val cmd = ByteArray(33)
    cmd[0] = 0xaf.toByte()
    for (i in 0 until 32) {
        cmd[i + 1] = challenge[i]
    }
    val resp = tag.transceive(cmd)
    return resp.drop(1).toByteArray()
}