package de.stustapay.stustapay.ui.chipscan

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.model.NfcTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NfcScanDialogViewModelTest {
    @Test
    fun `lost failures keep scanning and show rescan state`() {
        val step = reduceScanResult(
            NfcScanResult.Fail(NfcScanFailure.Lost("tag lost")),
            transientGuidance = "hold still",
        )

        assertTrue(step.continueScanning)
        assertEquals(NfcScanUiState.Rescan("hold still"), step.uiState)
    }

    @Test
    fun `auth failures stop scanning and show error state`() {
        val step = reduceScanResult(
            NfcScanResult.Fail(NfcScanFailure.Auth("bad key")),
            transientGuidance = "hold still",
        )

        assertFalse(step.continueScanning)
        assertEquals(NfcScanUiState.Error("bad key"), step.uiState)
    }

    @Test
    fun `incompatible failures stop scanning and show error state`() {
        val step = reduceScanResult(
            NfcScanResult.Fail(NfcScanFailure.Incompatible("wrong tag")),
            transientGuidance = "hold still",
        )

        assertFalse(step.continueScanning)
        assertEquals(NfcScanUiState.Error("wrong tag"), step.uiState)
    }

    @Test
    fun `successful scan stops scanning and returns success state`() {
        val tag = NfcTag(0x1234uL.toBigInteger(), "1234")
        val step = reduceScanResult(
            NfcScanResult.FastRead(tag),
            transientGuidance = "hold still",
        )

        assertFalse(step.continueScanning)
        assertEquals(NfcScanUiState.Success(tag), step.uiState)
    }
}
