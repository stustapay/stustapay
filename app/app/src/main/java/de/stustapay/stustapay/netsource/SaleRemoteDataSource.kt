package de.stustapay.stustapay.netsource


import de.stustapay.stustapay.model.CompletedSale
import de.stustapay.stustapay.model.NewSale
import de.stustapay.stustapay.model.Order
import de.stustapay.stustapay.model.PendingSale
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import javax.inject.Inject

class SaleRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI,
) {
    suspend fun checkSale(newOrder: NewSale): Response<PendingSale> {
        return terminalAPI.checkSale(newOrder)
    }

    suspend fun bookSale(newOrder: NewSale): Response<CompletedSale> {
        return terminalAPI.bookSale(newOrder)
    }

    suspend fun listSales(): Response<List<Order>> {
        return terminalAPI.listOrders()
    }

    suspend fun cancelSale(id: Int): Response<Unit> {
        return terminalAPI.cancelSale(id)
    }
}