package de.stustapay.stustapay.ec

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.libssp.model.NfcTag
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.math.BigDecimal

class SumUpTipOnCardReaderTest {
    private val basePayment = ECPayment(
        id = "payment-id",
        tag = NfcTag(0.toBigInteger(), null),
        amount = BigDecimal("1.00"),
    )

    @Test
    fun `enables tip when card payment and payment tip are enabled`() {
        assertTrue(
            shouldEnableTipOnCardReader(
                terminalConfig = ECTerminalConfig(
                    name = "Terminal",
                    id = "1",
                    eventName = "Event",
                    enableCardPayment = true,
                ),
                payment = basePayment,
            )
        )
    }

    @Test
    fun `disables tip when payment does not allow card reader tip`() {
        assertFalse(
            shouldEnableTipOnCardReader(
                terminalConfig = ECTerminalConfig(
                    name = "Terminal",
                    id = "1",
                    eventName = "Event",
                    enableCardPayment = true,
                ),
                payment = basePayment.copy(allowTipOnCardReader = false),
            )
        )
    }

    @Test
    fun `disables tip when card payment is disabled`() {
        assertFalse(
            shouldEnableTipOnCardReader(
                terminalConfig = ECTerminalConfig(
                    name = "Terminal",
                    id = "1",
                    eventName = "Event",
                    enableCardPayment = false,
                ),
                payment = basePayment,
            )
        )
    }

    @Test
    fun `merchant check only accepts exact configured merchant`() {
        assertTrue(isExpectedSumUpMerchant("MERCHANT-1", "MERCHANT-1"))
        assertFalse(isExpectedSumUpMerchant("MERCHANT-2", "MERCHANT-1"))
        assertFalse(isExpectedSumUpMerchant(null, "MERCHANT-1"))
        assertFalse(isExpectedSumUpMerchant("MERCHANT-1", ""))
    }
}
