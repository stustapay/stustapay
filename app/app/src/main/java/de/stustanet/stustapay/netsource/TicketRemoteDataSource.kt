package de.stustanet.stustapay.netsource


import de.stustanet.stustapay.model.CompletedTicketSale
import de.stustanet.stustapay.model.NewTicketSale
import de.stustanet.stustapay.model.NewTicketScan
import de.stustanet.stustapay.model.PendingTicketSale
import de.stustanet.stustapay.model.TicketScanResult
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
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