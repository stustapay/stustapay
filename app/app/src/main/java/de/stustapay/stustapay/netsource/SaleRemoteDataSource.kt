package de.stustapay.stustapay.netsource


import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.CompletedSale
import de.stustapay.api.models.NewSale
import de.stustapay.api.models.Order
import de.stustapay.api.models.PendingSale
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import de.stustapay.stustapay.net.execute
import javax.inject.Inject

class SaleRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun checkSale(newOrder: NewSale): Response<PendingSale> {
        return terminalApiAccessor.execute { it.order().checkSale(newOrder) }
    }

    suspend fun bookSale(newOrder: NewSale): Response<CompletedSale> {
        return terminalApiAccessor.execute { it.order().bookSale(newOrder) }
    }

    suspend fun listSales(): Response<List<Order>> {
        return terminalApiAccessor.execute { it.order().listOrders() }
    }

    suspend fun cancelSale(id: Int): Response<Unit> {
        return terminalApiAccessor.execute { it.order().cancelOrder(id.toBigInteger()) }
    }
}