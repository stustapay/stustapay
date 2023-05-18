package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.CompletedTicketSale
import de.stustanet.stustapay.model.NewTicketSale
import de.stustanet.stustapay.model.NewTicketScan
import de.stustanet.stustapay.model.PendingTicketSale
import de.stustanet.stustapay.model.TicketScanResult
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.TicketRemoteDataSource
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
