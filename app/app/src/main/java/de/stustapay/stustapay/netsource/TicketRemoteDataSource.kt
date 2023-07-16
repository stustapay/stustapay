package de.stustapay.stustapay.netsource


import de.stustapay.stustapay.model.CompletedTicketSale
import de.stustapay.stustapay.model.NewTicketSale
import de.stustapay.stustapay.model.NewTicketScan
import de.stustapay.stustapay.model.PendingTicketSale
import de.stustapay.stustapay.model.TicketScanResult
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import javax.inject.Inject

class TicketRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI,
) {
    suspend fun checkTicketScan(newTicketScan: NewTicketScan): Response<TicketScanResult> {
        return terminalAPI.checkTicketScan(newTicketScan)
    }

    suspend fun checkTicketSale(newTicketSale: NewTicketSale): Response<PendingTicketSale> {
        return terminalAPI.checkTicketSale(newTicketSale)
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        return terminalAPI.bookTicketSale(newTicketSale)
    }
}