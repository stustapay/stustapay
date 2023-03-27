package de.stustanet.stustapay.netsource


import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.PendingOrder
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class OrderRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun createOrder(newOrder: NewOrder): Response<PendingOrder> {
        return terminalAPI.createOrder(newOrder)
    }
}