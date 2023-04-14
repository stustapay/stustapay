package de.stustanet.stustapay

import de.stustanet.stustapay.nfc.cmacMfulaes
import de.stustanet.stustapay.nfc.genSessionKey
import de.stustanet.stustapay.util.asBitVector
import org.junit.Assert
import org.junit.Test

class NfcUnitTest {
    @Test
    fun cmacCalculation() {
        val k = ByteArray(16) { 0 }

        val rndA = ByteArray(16)
        rndA[0] = 0x42
        rndA[1] = 0xbd.toByte()
        rndA[2] = 0xf7.toByte()
        rndA[3] = 0xe0.toByte()
        rndA[4] = 0x8e.toByte()
        rndA[5] = 0x11
        rndA[6] = 0x0f
        rndA[7] = 0x14
        rndA[8] = 0xb6.toByte()
        rndA[9] = 0xd3.toByte()
        rndA[10] = 0x32
        rndA[11] = 0x3d
        rndA[12] = 0x14
        rndA[13] = 0xf1.toByte()
        rndA[14] = 0xc2.toByte()
        rndA[15] = 0xb9.toByte()

        val rndB = ByteArray(16)
        rndB[0] = 0x0d
        rndB[1] = 0x2b
        rndB[2] = 0xba.toByte()
        rndB[3] = 0x17
        rndB[4] = 0x01
        rndB[5] = 0x10
        rndB[6] = 0x98.toByte()
        rndB[7] = 0xe9.toByte()
        rndB[8] = 0x86.toByte()
        rndB[9] = 0x4c
        rndB[10] = 0x8a.toByte()
        rndB[11] = 0xa5.toByte()
        rndB[12] = 0x19
        rndB[13] = 0x2a
        rndB[14] = 0xf7.toByte()
        rndB[15] = 0x96.toByte()

        val sessionKey = genSessionKey(k.asBitVector(), rndA.asBitVector(), rndB.asBitVector());

        val msg = ByteArray(1)
        msg[0] = 0x60

        val cmac = msg.asBitVector().cmacMfulaes(sessionKey, 0u)

        val expectedCmac = ByteArray(8)
        expectedCmac[0] = 0x1d
        expectedCmac[1] = 0x5d
        expectedCmac[2] = 0xe8.toByte()
        expectedCmac[3] = 0x02
        expectedCmac[4] = 0xd6.toByte()
        expectedCmac[5] = 0x75
        expectedCmac[6] = 0x16
        expectedCmac[7] = 0x70

        Assert.assertArrayEquals(expectedCmac, cmac.asByteArray())
    }
}