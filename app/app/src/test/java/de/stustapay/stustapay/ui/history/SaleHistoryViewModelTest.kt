package de.stustapay.stustapay.ui.history

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.Order
import de.stustapay.api.models.OrderType
import de.stustapay.api.models.PaymentMethod
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.time.OffsetDateTime
import java.util.UUID

class SaleHistoryViewModelTest {
    @Test
    fun `filters money transfer orders from history`() {
        val sale = order(
            id = 1,
            orderType = OrderType.sale,
            bookedAt = "2026-04-13T09:00:00Z",
        )
        val transfer = order(
            id = 2,
            orderType = OrderType.money_transfer,
            bookedAt = "2026-04-13T09:05:00Z",
        )
        val imbalance = order(
            id = 3,
            orderType = OrderType.money_transfer_imbalance,
            bookedAt = "2026-04-13T09:10:00Z",
        )
        val topUp = order(
            id = 4,
            orderType = OrderType.top_up,
            bookedAt = "2026-04-13T09:15:00Z",
        )

        val filtered = filterVisibleHistoryOrders(listOf(sale, transfer, imbalance, topUp))

        assertEquals(listOf(sale, topUp), filtered)
        assertFalse(filtered.any { it.orderType == OrderType.money_transfer })
        assertFalse(filtered.any { it.orderType == OrderType.money_transfer_imbalance })
    }

    private fun order(
        id: Int,
        orderType: OrderType,
        bookedAt: String,
    ): Order {
        return Order(
            id = id.toBigInteger(),
            uuid = UUID.fromString("00000000-0000-0000-0000-%012d".format(id)),
            totalPrice = 10.0,
            totalTax = 0.0,
            totalNoTax = 10.0,
            cancelsOrder = null,
            bookedAt = OffsetDateTime.parse(bookedAt),
            paymentMethod = PaymentMethod.cash,
            orderType = orderType,
            cashierId = null,
            tillId = 1.toBigInteger(),
            cashRegisterId = null,
            customerAccountId = null,
            customerTagUid = null,
            customerTagId = null,
            lineItems = emptyList(),
            customerTagUidHex = null,
        )
    }
}
