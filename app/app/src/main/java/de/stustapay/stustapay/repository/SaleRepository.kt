package de.stustapay.stustapay.repository

import de.stustapay.api.models.CompletedSale
import de.stustapay.api.models.NewSale
import de.stustapay.api.models.Order
import de.stustapay.api.models.PendingSale
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.netsource.SaleRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SaleRepository @Inject constructor(
    private val saleRemoteDataSource: SaleRemoteDataSource,
) {
    suspend fun checkSale(newSale: NewSale): Response<PendingSale> {
        return saleRemoteDataSource.checkSale(newSale)
    }

    suspend fun bookSale(newSale: NewSale): Response<CompletedSale> {
        return saleRemoteDataSource.bookSale(newSale)
    }

    suspend fun listSales(): Response<List<Order>> {
        return saleRemoteDataSource.listSales()
    }

    suspend fun cancelSale(id: Int): Response<Unit> {
        return saleRemoteDataSource.cancelSale(id)
    }
}
