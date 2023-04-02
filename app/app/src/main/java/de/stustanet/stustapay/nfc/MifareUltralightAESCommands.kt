package de.stustanet.stustapay.nfc

import android.nfc.tech.NfcA
import kotlin.experimental.xor

const val PAGE_COUNT = 60
const val USER_BYTES = 144

fun cmdGetVersion(tag: NfcA): ByteArray {
    val cmd = ByteArray(1)
    cmd[0] = 0x60
    return tag.transceive(cmd)
}

fun cmdGetVersion(k: ByteArray, ctr: UShort, tag: NfcA): ByteArray {
    var cmd = ByteArray(1)
    cmd[0] = 0x60
    cmd = extendCmdWithCmac(k, cmd, ctr)

    val resp = tag.transceive(cmd)
    if (!verifyRespCmac(k, resp, (ctr + 1u).toUShort())) { throw SecurityException("Invalid response CMAC") }
    return resp.sliceArray(0 until 8)
}

fun cmdRead(page: Byte, tag: NfcA): ByteArray {
    if (page !in 0x00 until PAGE_COUNT) { throw IllegalArgumentException() }

    val cmd = ByteArray(2)
    cmd[0] = 0x30
    cmd[1] = page
    return tag.transceive(cmd)
}

fun cmdRead(page: Byte, k: ByteArray, ctr: UShort, tag: NfcA): ByteArray {
    if (page !in 0x00 until PAGE_COUNT) { throw IllegalArgumentException() }

    var cmd = ByteArray(2)
    cmd[0] = 0x30
    cmd[1] = page
    cmd = extendCmdWithCmac(k, cmd, ctr)

    val resp = tag.transceive(cmd)
    if (!verifyRespCmac(k, resp, (ctr + 1u).toUShort())) { throw SecurityException("Invalid response CMAC") }
    return resp.sliceArray(0 until 16)
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

fun cmdWrite(page: Byte, a: Byte, b: Byte, c: Byte, d: Byte, k: ByteArray, ctr: UShort, tag: NfcA) {
    if (page !in 0x00 until PAGE_COUNT) { throw Exception("Invalid parameters") }

    var cmd = ByteArray(6)
    cmd[0] = 0xa2.toByte()
    cmd[1] = page
    cmd[2] = a
    cmd[3] = b
    cmd[4] = c
    cmd[5] = d
    cmd = extendCmdWithCmac(k, cmd, ctr)

    val resp = tag.transceive(cmd)
    if (!verifyRespCmac(k, resp, (ctr + 1u).toUShort())) { throw SecurityException("Invalid response CMAC") }
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

fun extendCmdWithCmac(k: ByteArray, cmd: ByteArray, ctr: UShort): ByteArray {
    val cmac = cmacMfulaes(k, cmd, ctr)

    val ret = ByteArray(cmd.size + 8)
    for (i in cmd.indices) { ret[i] = cmd[i] }
    for (i in 0 until 8) { ret[cmd.size + i] = cmac[i] }

    return ret
}

fun verifyRespCmac(k: ByteArray, resp: ByteArray, ctr: UShort): Boolean {
    val respM = resp.sliceArray(0 until resp.size - 8)
    val respCmac = resp.sliceArray(resp.size - 8 until resp.size)

    val cmac = cmacMfulaes(k, respM, ctr)
    return respCmac.contentEquals(cmac)
}

fun cmacMfulaes(k: ByteArray, msg: ByteArray, ctr: UShort): ByteArray {
    val m = ByteArray(msg.size + 2)
    m[0] = (ctr and 0xffu).toByte()
    m[1] = ((ctr.toULong() shr 8) and 0xffu).toByte()
    for (i in msg.indices) { m[2 + i] = msg[i] }

    val cmac = cmac(k, m)

    val ret = ByteArray(8)
    for (i in 0 until 8) {
        ret[i] = cmac[2 * i + 1]
    }

    return ret
}

fun genSessionKey(k: ByteArray, rndA: ByteArray, rndB: ByteArray): ByteArray {
    val sv = ByteArray(32)
    sv[0] = 0x5a
    sv[1] = 0xa5.toByte()
    sv[2] = 0x00
    sv[3] = 0x01
    sv[4] = 0x00
    sv[5] = 0x80.toByte()
    for (i in 0 until 2) {
        sv[6 + i] = rndA[15 - (15 - i)]
    }
    for (i in 0 until 6) {
        sv[8 + i] = rndA[15 - (13 - i)] xor rndB[15 - (15 - i)]
    }
    for (i in 0 until 10) {
        sv[14 + i] = rndB[15 - (9 - i)]
    }
    for (i in 0 until 8) {
        sv[24 + i] = rndA[15 - (7 - i)]
    }

    return cmac(k, sv)
}