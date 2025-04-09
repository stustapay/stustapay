package de.stustapay.stustapay.ui.ticket

import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.PaymentMethod
import de.stustapay.api.models.PendingTicketSale
import de.stustapay.api.models.Ticket
import de.stustapay.api.models.UserTagScan
import de.stustapay.libssp.model.NfcTag
import java.util.UUID


data class ScannedTicket(
    val tag: NfcTag,
    val ticket: Ticket,
)

/**
 * Which tickets were selected?
 */
data class TicketDraft(
    /**
     * when checking the sale, server returns this.
     */
    var pendingSale: PendingTicketSale? = null,

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
        pendingSale = pendingTicketSale
    }

    fun tagKnown(tag: NfcTag): Boolean {
        return scans.any { it.tag == tag }
    }

    /** generate a ticket sale - always fresh UUID */
    fun getNewTicketSale(paymentMethod: PaymentMethod?): NewTicketSale {
        return NewTicketSale(
            uuid = UUID.randomUUID(),
            customerTags = scans.mapNotNull {
                UserTagScan(
                    it.tag.uid, it.tag.pin ?: return@mapNotNull null
                )
            },
            paymentMethod = paymentMethod,
        )
    }

    fun addTicket(ticket: ScannedTicket): Boolean {
        return if (tagKnown(ticket.tag)) {
            false
        } else {
            scans += ticket
            statusSerial += 1u
            true
        }
    }
}