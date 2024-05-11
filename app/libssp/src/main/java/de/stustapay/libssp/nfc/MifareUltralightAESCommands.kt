package de.stustapay.libssp.nfc

import android.nfc.tech.NfcA
import de.stustapay.libssp.util.BitVector
import de.stustapay.libssp.util.asBitVector
import de.stustapay.libssp.util.bv

const val PAGE_COUNT = 60uL
const val USER_BYTES = 144uL

fun cmdGetVersion(tag: NfcA): BitVector {
    val cmd = 0x60.bv
    return tag.transceive(cmd.asByteArray()).asBitVector()
}

fun cmdGetVersion(k: BitVector, ctr: UShort, tag: NfcA): BitVector {
    var cmd = 0x60.bv
    cmd += cmd.cmacMfulaes(k, ctr)
    val resp = tag.transceive(cmd.asByteArray()).asBitVector()

    if (!resp.verifyCmacMfulaes(k, (ctr + 1u).toUShort())) { throw SecurityException("Invalid response CMAC") }
    return resp.slice(resp.len - 8uL * 8uL, resp.len)
}

fun cmdRead(page: UByte, tag: NfcA): BitVector {
    if (page !in 0x00uL until PAGE_COUNT) { throw IllegalArgumentException() }

    val cmd = 0x30.bv + page.bv
    return tag.transceive(cmd.asByteArray()).asBitVector()
}

fun cmdRead(page: UByte, k: BitVector, ctr: UShort, tag: NfcA): BitVector {
    if (page !in 0x00uL until PAGE_COUNT) { throw IllegalArgumentException() }

    var cmd = 0x30.bv + page.bv
    cmd += cmd.cmacMfulaes(k, ctr)
    val resp = tag.transceive(cmd.asByteArray()).asBitVector()

    if (!resp.verifyCmacMfulaes(k, (ctr + 1u).toUShort())) { throw SecurityException("Invalid response CMAC") }
    return resp.slice(resp.len - 16uL * 8uL, resp.len)
}

fun cmdWrite(page: UByte, a: UByte, b: UByte, c: UByte, d: UByte, tag: NfcA) {
    if (page !in 0x00uL until PAGE_COUNT) { throw Exception("Invalid parameters") }

    val cmd = 0xa2.bv + page.bv + a.bv + b.bv + c.bv + d.bv
    tag.transceive(cmd.asByteArray())
}

fun cmdWrite(page: UByte, a: UByte, b: UByte, c: UByte, d: UByte, k: BitVector, ctr: UShort, tag: NfcA) {
    if (page !in 0x00uL until PAGE_COUNT) { throw Exception("Invalid parameters") }

    var cmd = 0xa2.bv + page.bv + a.bv + b.bv + c.bv + d.bv
    cmd += cmd.cmacMfulaes(k, ctr)
    val resp = tag.transceive(cmd.asByteArray()).asBitVector()

    if (!resp.verifyCmacMfulaes(k, (ctr + 1u).toUShort())) { throw SecurityException("Invalid response CMAC") }
}

fun cmdAuthenticate1(type: UByte, tag: NfcA): BitVector {
    if (type !in 0x00u..0x02u) { throw Exception("Invalid parameters") }

    val cmd = 0x1a.bv + type.bv
    val resp = tag.transceive(cmd.asByteArray()).asBitVector()
    return resp.slice(0uL, resp.len - 8uL)
}

fun cmdAuthenticate2(challenge: BitVector, tag: NfcA): BitVector {
    if (challenge.len != 32uL * 8uL) { throw Exception("Invalid parameters") }

    var cmd = 0xaf.bv
    for (i in 0uL until 32uL) {
        cmd += challenge.gbe(i).bv
    }
    val resp = tag.transceive(cmd.asByteArray()).asBitVector()
    return resp.slice(0uL, resp.len - 8uL)
}