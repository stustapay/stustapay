package de.stustapay.stustapay.netsource

import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTicketScan
import de.stustapay.api.models.PendingTicketSale
import de.stustapay.api.models.TicketScanResult
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

class TicketRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun checkTicketScan(newTicketScan: NewTicketScan): Response<TicketScanResult> {
        return terminalApiAccessor.execute { it.order()?.checkTicketScan(newTicketScan) }
    }

    suspend fun checkTicketSale(newTicketSale: NewTicketSale): Response<PendingTicketSale> {
        return terminalApiAccessor.execute { it.order()?.checkTicketSale(newTicketSale) }
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        return terminalApiAccessor.execute { it.order()?.bookTicketSale(newTicketSale) }
    }
}