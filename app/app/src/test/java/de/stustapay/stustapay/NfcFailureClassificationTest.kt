package de.stustapay.stustapay

import android.nfc.TagLostException
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.nfc.TagAuthException
import de.stustapay.libssp.nfc.TagConnectionException
import de.stustapay.libssp.nfc.TagIncompatibleException
import de.stustapay.libssp.nfc.TagTransientException
import de.stustapay.libssp.nfc.classifyNfcFailure
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class NfcFailureClassificationTest {
    @Test
    fun `classifies incompatible tag errors`() {
        val failure = classifyNfcFailure(TagIncompatibleException("unsupported"))

        assertEquals(NfcScanFailure.Incompatible("unsupported"), failure)
    }

    @Test
    fun `classifies auth errors`() {
        val failure = classifyNfcFailure(TagAuthException("bad key"))

        assertEquals(NfcScanFailure.Auth("bad key"), failure)
    }

    @Test
    fun `classifies transient transport errors as lost`() {
        val failure = classifyNfcFailure(TagTransientException("tag moved"))

        assertEquals(NfcScanFailure.Lost("tag moved"), failure)
    }

    @Test
    fun `classifies nested tag lost exceptions as lost`() {
        val failure = classifyNfcFailure(IOException("outer", TagLostException("lost field")))

        assertTrue(failure is NfcScanFailure.Lost)
    }

    @Test
    fun `classifies connection errors as lost`() {
        val failure = classifyNfcFailure(TagConnectionException())

        assertTrue(failure is NfcScanFailure.Lost)
    }
}
