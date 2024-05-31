package de.stustapay.stustapay.model

import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.libssp.net.Response


sealed interface InfallibleApiResponse {
    fun submitSuccess(): Boolean

    data class TopUp(
        val topUp: Response<CompletedTopUp>
    ) : InfallibleApiResponse {
        override fun submitSuccess(): Boolean {
            return topUp.submitSuccess()
        }
    }

    data class TicketSale(
        val ticketSale: Response<CompletedTicketSale>
    ) : InfallibleApiResponse {
        override fun submitSuccess(): Boolean {
            return ticketSale.submitSuccess()
        }
    }
}