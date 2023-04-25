package de.stustanet.stustapay.netsource


import de.stustanet.stustapay.model.CompletedSale
import de.stustanet.stustapay.model.NewSale
import de.stustanet.stustapay.model.Order
import de.stustanet.stustapay.model.PendingSale
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
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