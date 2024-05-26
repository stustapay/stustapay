package de.stustapay.stustapay.model

import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp

sealed class InfallibleApiRequest(
    var status: Status = Status.Normal
) {
    abstract fun msg(): String

    /** when the request has failed, record it */
    fun markFailed() {
        status = Status.Failed
    }

    fun markNormal() {
        status = Status.Normal
    }

    sealed interface Status {
        object Normal : Status
        object Failed : Status
    }

    class TopUp(
        val topUp: NewTopUp,
        status: Status = Status.Normal,
    ) : InfallibleApiRequest(status) {
        override fun msg(): String {
            return "Top-Up %.2f€ with %s for %s".format(
                topUp.amount,
                topUp.paymentMethod,
                topUp.customerTagUid.toString(16).uppercase()
            )
        }
    }

    class TicketSale(
        val ticketSale: NewTicketSale,
        status: Status = Status.Normal,
    ) : InfallibleApiRequest(status) {

        override fun msg(): String {
            return "Ticket sale for %s".format(ticketSale.customerTags.joinToString { it.tagPin })
        }
    }
}
