package de.stustanet.stustapay.ui.ticket

import de.stustanet.stustapay.model.NewTicketSale
import de.stustanet.stustapay.model.PaymentMethod
import de.stustanet.stustapay.model.PendingTicketSale
import de.stustanet.stustapay.model.Ticket
import de.stustanet.stustapay.model.UserTag
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