package de.stustapay.stustapay.repository

import de.stustapay.stustapay.model.CompletedTicketSale
import de.stustapay.stustapay.model.NewTicketSale
import de.stustapay.stustapay.model.NewTicketScan
import de.stustapay.stustapay.model.PendingTicketSale
import de.stustapay.stustapay.model.TicketScanResult
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
