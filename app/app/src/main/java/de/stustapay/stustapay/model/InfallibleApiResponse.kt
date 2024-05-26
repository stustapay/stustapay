package de.stustapay.stustapay.model

import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.libssp.net.Response


sealed interface InfallibleApiResponse {
    data class TopUp(
        val topUp: Response<CompletedTopUp>
    ) : InfallibleApiResponse

    data class TicketSale(
        val ticketSale: Response<CompletedTicketSale>
    ) : InfallibleApiResponse
}