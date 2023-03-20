package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.net.OrderRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(
    private val orderRemoteDataSource: OrderRemoteDataSource,
) {
    suspend fun createOrder(newOrder: NewOrder) {
        orderRemoteDataSource.createOrder(newOrder)
    }
}
