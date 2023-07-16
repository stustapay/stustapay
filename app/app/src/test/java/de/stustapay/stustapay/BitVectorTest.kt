package de.stustapay.stustapay

import de.stustapay.stustapay.util.BitVector
import de.stustapay.stustapay.util.bv
import org.junit.Assert
import org.junit.Test

class BitVectorTest {
    @Test
    fun createBitVector() {
        var bv = BitVector(4uL)
        bv[0uL] = true

        Assert.assertEquals(1u.toUByte(), bv.gbe(0uL))

        val byte = 8.bv

        Assert.assertEquals(8u.toUByte(), byte.gbe(0uL))

        bv += byte

        Assert.assertEquals(1u.toUByte(), bv.gbe(0uL))
        Assert.assertEquals(8u.toUByte(), bv.gbe(1uL))

        bv += BitVector(4uL)

        Assert.assertEquals(16u.toUByte(), bv.gbe(0uL))
        Assert.assertEquals(128u.toUByte(), bv.gbe(1uL))
    }
}