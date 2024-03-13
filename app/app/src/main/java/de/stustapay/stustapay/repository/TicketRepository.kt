package de.stustapay.stustapay.repository

import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTicketScan
import de.stustapay.api.models.PendingTicketSale
import de.stustapay.api.models.TicketScanResult
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.netsource.TicketRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TicketRepository @Inject constructor(
    private val ticketRemoteDataSource: TicketRemoteDataSource,
) {
    suspend fun checkTicketScan(newTicketScan: NewTicketScan): Response<TicketScanResult> {
        return ticketRemoteDataSource.checkTicketScan(newTicketScan)
    }

    suspend fun checkTicketSale(newTicketSale: NewTicketSale): Response<PendingTicketSale> {
        return ticketRemoteDataSource.checkTicketSale(newTicketSale)
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        return ticketRemoteDataSource.bookTicketSale(newTicketSale)
    }
}
