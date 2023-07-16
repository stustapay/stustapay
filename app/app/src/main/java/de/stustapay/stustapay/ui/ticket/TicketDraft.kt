package de.stustapay.stustapay.ui.ticket

import de.stustapay.stustapay.model.NewTicketSale
import de.stustapay.stustapay.model.PaymentMethod
import de.stustapay.stustapay.model.PendingTicketSale
import de.stustapay.stustapay.model.Ticket
import de.stustapay.stustapay.model.UserTag
import java.util.UUID


data class ScannedTicket(
    val tag: UserTag,
    val ticket: Ticket,
)

/**
 * Which tickets were selected?
 */
data class TicketDraft(
    /**
     * when checking the sale, server returns this.
     */
    var checkedSale: PendingTicketSale? = null,

    /**
     * status serial so objects are different..
     */
    var statusSerial: ULong = 0u,

    /**
     * sumup payment identifier suffix
     * because for the same checked order we can have multiple sumup attempts.
     * and each of them needs a unique identifier.
     */
    var ecRetry: ULong = 0u,

    /**
     * association of scanned tags with their sold tickets.
     * we keep the order so we can assign the order to the first one.
     */
    var scans: List<ScannedTicket> = listOf(),
) {
    fun updateWithPendingTicketSale(pendingTicketSale: PendingTicketSale) {
        checkedSale = pendingTicketSale
    }

    fun tagKnown(tag: UserTag): Boolean {
        return scans.any { it.tag == tag }
    }

    /** ec transaction has failed, so we need a new transaction id. */
    fun ecFailure() {
        ecRetry += 1u
    }

    fun getNewTicketSale(paymentMethod: PaymentMethod?): NewTicketSale {
        return NewTicketSale(
            uuid = checkedSale?.uuid ?: UUID.randomUUID().toString(),
            customer_tag_uids = scans.map { it.tag.uid },
            payment_method = paymentMethod,
        )
    }

    fun addTicket(ticket: ScannedTicket): Boolean {
        return if (tagKnown(ticket.tag)) {
            false
        }
        else {
            scans += ticket
            statusSerial += 1u
            true
        }
    }
}