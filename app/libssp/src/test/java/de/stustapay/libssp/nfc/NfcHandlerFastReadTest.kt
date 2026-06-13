package de.stustapay.libssp.nfc

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.model.NfcTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NfcHandlerFastReadTest {
    @Test
    fun `fast read result decodes uid and pin from tag id`() {
        val result = fastReadResult(byteArrayOf(0x01, 0x23, 0x45, 0x67))

        assertEquals(
            NfcScanResult.FastRead(NfcTag(0x01234567uL.toBigInteger(), "01234567")),
            result
        )
    }

    @Test
    fun `fast read accepts nfc a tag without mifare ultralight tech`() {
        val result = fastReadResultForTechList(
            arrayOf("android.nfc.tech.NfcA"),
            byteArrayOf(0x01, 0x23, 0x45, 0x67)
        )

        assertEquals(
            NfcScanResult.FastRead(NfcTag(0x01234567uL.toBigInteger(), "01234567")),
            result
        )
    }

    @Test
    fun `missing tag id is classified as recoverable lost`() {
        val result = fastReadResult(null)

        assertTrue(result is NfcScanResult.Fail)
        assertEquals(NfcScanFailure.Lost("Tag UID missing"), (result as NfcScanResult.Fail).reason)
    }

    @Test
    fun `empty tag id is classified as recoverable lost`() {
        val result = fastReadResult(byteArrayOf())

        assertTrue(result is NfcScanResult.Fail)
        assertEquals(NfcScanFailure.Lost("Tag UID missing"), (result as NfcScanResult.Fail).reason)
    }

    @Test
    fun `non nfc a tags are incompatible`() {
        val result = fastReadResultForTechList(
            arrayOf("android.nfc.tech.NfcB"),
            byteArrayOf(0x01, 0x23, 0x45, 0x67)
        )

        assertEquals(
            NfcScanResult.Fail(NfcScanFailure.Incompatible("Device has no NfcA support")),
            result
        )
    }
}
