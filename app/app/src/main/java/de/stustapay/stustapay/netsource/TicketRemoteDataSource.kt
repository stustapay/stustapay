package de.stustapay.stustapay.netsource

import de.stustapay.api.models.CancelOrderPayload
import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTicketScan
import de.stustapay.api.models.PendingTicketSale
import de.stustapay.api.models.TicketScanResult
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import java.util.UUID
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

    suspend fun registerTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        return terminalApiAccessor.execute { it.order()?.registerPendingTicketSale(newTicketSale) }
    }

    suspend fun cancelPendingTicketSale(orderUUID: UUID): Response<Unit> {
        return terminalApiAccessor.execute { it.order()?.cancelPendingTicketSale(CancelOrderPayload(orderUuid = orderUUID)) }
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        return terminalApiAccessor.execute { it.order()?.bookTicketSale(newTicketSale) }
    }
}