package de.stustapay.stustapay.ui.ticket

import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTicketScan
import de.stustapay.api.models.PaymentMethod
import de.stustapay.api.models.PendingTicketSale
import de.stustapay.api.models.Ticket
import de.stustapay.api.models.UserTagScan
import de.stustapay.libssp.model.NfcTag
import java.util.UUID


/** display and submission for checks */
data class ScannedTicket(
    /** which tag this will be for */
    val nfcTag: NfcTag,
    /** ticket associated with the scan */
    val ticket: Ticket,
    /** how much does the user want to top up now */
    val plannedTopUp: Double,
    /** how much is in the account already? (due to online-topup before ticket sale) */
    val accountBalance: Double?,
    /** which voucher was used */
    val voucherToken: String?,
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
     * what was scanned and set for topUps/ticket voucher.
     */
    var scans: MutableMap<NfcTag, UserTagScan> = mutableMapOf(),

    /**
     * association of scanned tags with their sold tickets.
     * it's what the server reports and what we display.
     */
    var tickets: List<ScannedTicket> = listOf(),
) {
    fun copy(pendingSale: PendingTicketSale? = null): TicketDraft {
        return TicketDraft(
            pendingSale = pendingSale ?: this.pendingSale,
            statusSerial = statusSerial,
            scans = scans.toMutableMap(),
            tickets = tickets.toList(),
        )
    }

    fun tagKnown(tag: NfcTag): Boolean {
        return tag in scans
    }

    fun addScan(tag: NfcTag) {
        scans[tag] = UserTagScan(tagUid = tag.uid, tagPin = tag.pin!!)
        statusSerial += 1u
    }

    fun getTicketScan(): NewTicketScan {
        return NewTicketScan(
            customerTags = scans.values.toList(),
        )
    }

    /** generate a ticket sale - always fresh UUID */
    fun getNewTicketSale(paymentMethod: PaymentMethod?): NewTicketSale {
        return NewTicketSale(
            uuid = UUID.randomUUID(),
            customerTags = scans.values.toList(),
            paymentMethod = paymentMethod,
        )
    }

    fun setVoucherToken(tag: NfcTag, token: String): Boolean {
        return scans[tag]?.let {
            val scan = it.copy(voucherToken = token)
            scans[tag] = scan
            statusSerial += 1u
            true
        } == true
    }

    fun setTopUpAmount(tag: NfcTag, amount: Double): Boolean {
        return scans[tag]?.let {
            val scan = it.copy(topUpAmount = amount)
            scans[tag] = scan
            statusSerial += 1u
            true
        } == true
    }
}