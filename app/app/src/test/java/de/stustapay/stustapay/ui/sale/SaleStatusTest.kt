package de.stustapay.stustapay.ui.sale

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.TerminalTillConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class SaleStatusTest {
    @Test
    fun `returnable buttons use signed net quantities and remove zero`() {
        val saleStatus = SaleStatus()
        val saleConfig = saleConfigWithReturnableButton()

        saleStatus.decrementButton(1, saleConfig)
        assertEquals(-1, (saleStatus.buttonSelection[1] as SaleItemAmount.FixedPrice).amount)

        saleStatus.decrementButton(1, saleConfig)
        assertEquals(-2, (saleStatus.buttonSelection[1] as SaleItemAmount.FixedPrice).amount)

        saleStatus.incrementButton(1, saleConfig)
        assertEquals(-1, (saleStatus.buttonSelection[1] as SaleItemAmount.FixedPrice).amount)

        saleStatus.incrementButton(1, saleConfig)
        assertFalse(saleStatus.buttonSelection.containsKey(1))

        saleStatus.incrementButton(1, saleConfig)
        assertEquals(1, (saleStatus.buttonSelection[1] as SaleItemAmount.FixedPrice).amount)
    }

    private fun saleConfigWithReturnableButton(): SaleConfig.Ready {
        return SaleConfig.Ready(
            tillName = "Test Till",
            buttons = mapOf(
                1 to SaleItemConfig(
                    id = 1,
                    caption = "Pfand Becher",
                    price = SaleItemPrice.Returnable(2.0),
                    returnable = true,
                )
            ),
            till = TerminalTillConfig(
                id = 1.toBigInteger(),
                name = "Test Till",
                description = null,
                eventName = "Test Event",
                profileName = "Test Profile",
                cashRegisterId = 1.toBigInteger(),
                cashRegisterName = "Cash",
                allowTopUp = false,
                allowCashOut = false,
                allowTicketSale = false,
                allowTicketVouchers = false,
                enableSspPayment = true,
                enableCashPayment = true,
                enableCardPayment = true,
                buttons = emptyList(),
                sumupSecrets = null,
                postPaymentAllowed = false,
                sumupPaymentEnabled = false,
                userPrivileges = emptyList(),
                secrets = null,
                activeUserId = null,
                availableRoles = emptyList(),
            ),
        )
    }
}
