package de.stustanet.stustapay.net


import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.PendingOrder
import javax.inject.Inject

class OrderRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun createOrder(newOrder: NewOrder): PendingOrder {
        return terminalAPI.createOrder(newOrder)
    }
}