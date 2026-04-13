package de.stustapay.stustapay.ui.sale

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SaleViewModelParsingTest {
    @Test
    fun `parses insufficient funds details when both amounts are present`() {
        val parsed = parseInsufficientFundsDetails(
            "Not enough funds available:\nNeeded: 12.50\nAvailable: 5.00"
        )

        requireNotNull(parsed)
        assertEquals(12.50, parsed.neededAmount, 0.0)
        assertEquals(5.00, parsed.availableAmount, 0.0)
    }

    @Test
    fun `does not parse unrelated error messages`() {
        val parsed = parseInsufficientFundsDetails("Backend timeout while checking sale")

        assertNull(parsed)
    }

    @Test
    fun `does not parse incomplete insufficient funds messages`() {
        val parsed = parseInsufficientFundsDetails(
            "Not enough funds available:\nNeeded: 12.50"
        )

        assertNull(parsed)
    }
}
