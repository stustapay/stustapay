package de.stustapay.stustapay.display

import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Locale

class CustomerDisplayFormattingTest {
    @Test
    fun `formats completed sale and top up amounts with two decimals in german locale`() {
        assertEquals("12,50", formatCustomerDisplayAmountValue(12.5, Locale.GERMANY))
        assertEquals("12,50 €", formatCustomerDisplayAmount(12.5, Locale.GERMANY))
        assertEquals("0,30 €", formatCustomerDisplayAmount(0.3, Locale.GERMANY))
    }

    @Test
    fun `formats insufficient funds values with two decimals in english locale`() {
        assertEquals("12.50", formatCustomerDisplayAmountValue(12.5, Locale.ENGLISH))
        assertEquals("1.10 €", formatCustomerDisplayAmount(1.1, Locale.ENGLISH))
        assertEquals("10.00 €", formatCustomerDisplayAmount(10.0, Locale.ENGLISH))
    }
}
