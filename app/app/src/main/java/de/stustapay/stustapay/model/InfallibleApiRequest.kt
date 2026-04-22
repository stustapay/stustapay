package de.stustapay.stustapay.model

import de.stustapay.api.models.NewSale
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp

/**
 * a not-yet-delivered guaranteed request.
 * status could be a parent-class attribute but this destroys funny data class guarantees
 * for correct equality consideration in updates in the datastore.
 */
sealed interface InfallibleApiRequest {
    fun msg(): String

    fun asNormal(): InfallibleApiRequest
    fun asFailed(): InfallibleApiRequest
    fun status(): Status

    sealed interface Status {
        object Normal : Status
        object Failed : Status
    }

    data class TopUp(
        val topUp: NewTopUp,
        val status: Status = Status.Normal,
    ) : InfallibleApiRequest {
        override fun msg(): String {
            return "Top-Up %.2f€ with %s for %s".format(
                topUp.amount,
                topUp.paymentMethod,
                topUp.customerTagUid.toString(16).uppercase()
            )
        }

        override fun asNormal(): InfallibleApiRequest {
            return TopUp(topUp, Status.Normal)
        }

        override fun asFailed(): InfallibleApiRequest {
            return TopUp(topUp, Status.Failed)
        }

        override fun status(): Status {
            return status
        }
    }

    data class TicketSale(
        val ticketSale: NewTicketSale,
        val status: Status = Status.Normal,
    ) : InfallibleApiRequest {
        override fun msg(): String {
            return "Ticket sale for %s".format(ticketSale.customerTags.joinToString { it.tagPin })
        }

        override fun asNormal(): InfallibleApiRequest {
            return TicketSale(ticketSale, Status.Normal)
        }

        override fun asFailed(): InfallibleApiRequest {
            return TicketSale(ticketSale, Status.Failed)
        }

        override fun status(): Status {
            return status
        }
    }

    data class Sale(
        val sale: NewSale,
        val status: Status = Status.Normal,
    ) : InfallibleApiRequest {
        override fun msg(): String {
            return "Sale ${sale.uuid} with ${sale.paymentMethod}"
        }

        override fun asNormal(): InfallibleApiRequest {
            return Sale(sale, Status.Normal)
        }

        override fun asFailed(): InfallibleApiRequest {
            return Sale(sale, Status.Failed)
        }

        override fun status(): Status {
            return status
        }
    }
}
