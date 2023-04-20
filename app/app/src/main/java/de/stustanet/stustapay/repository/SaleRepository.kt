package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.CompletedSale
import de.stustanet.stustapay.model.NewSale
import de.stustanet.stustapay.model.PendingSale
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.SaleRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SaleRepository @Inject constructor(
    private val saleRemoteDataSource: SaleRemoteDataSource,
) {
    suspend fun createSale(newSale: NewSale): Response<PendingSale> {
        return saleRemoteDataSource.checkSale(newSale)
    }

    suspend fun bookSale(newSale: NewSale): Response<CompletedSale> {
        return saleRemoteDataSource.bookSale(newSale)
    }
}
