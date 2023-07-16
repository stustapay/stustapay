package de.stustapay.stustapay.nfc

import de.stustapay.stustapay.util.BitVector
import de.stustapay.stustapay.util.bv
import de.stustapay.stustapay.util.cmac

fun BitVector.cmacMfulaes(k: BitVector, ctr: UShort): BitVector {
    val m = (ctr and 0xffu).bv + ((ctr.toULong() shr 8) and 0xffu).bv + this

    val cmac = m.cmac(k)

    var ret = BitVector(0uL)
    for (i in 0uL until 8uL) {
        ret += cmac.gbe(2uL * i + 1uL).bv
    }

    return ret
}

fun BitVector.verifyCmacMfulaes(k: BitVector, ctr: UShort): Boolean {
    try {
        val respCmac = this.slice(0uL, 8uL * 8uL)
        val respM = this.slice(8uL * 8uL, this.len)

        val cmac = respM.cmacMfulaes(k, ctr)
        return respCmac.equals(cmac)
    } catch (e: ArrayIndexOutOfBoundsException) {
        return false
    }
}

fun genSessionKey(k: BitVector, rndA: BitVector, rndB: BitVector): BitVector {
    var sv = 0x5a.bv + 0xa5.bv + 0x00.bv + 0x01.bv + 0x00.bv + 0x80.bv
    for (i in 0uL until 2uL) {
        sv += rndA.gbe(i).bv
    }
    for (i in 0uL until 6uL) {
        sv += (rndA.gbe(2uL + i) xor rndB.gbe(i)).bv
    }
    for (i in 0uL until 10uL) {
        sv += rndB.gbe(6uL + i).bv
    }
    for (i in 0uL until 8uL) {
        sv += rndA.gbe(8uL + i).bv
    }

    return sv.cmac(k)
}