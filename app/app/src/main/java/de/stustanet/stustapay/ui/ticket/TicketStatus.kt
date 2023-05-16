package de.stustanet.stustapay.ui.ticket

import de.stustanet.stustapay.model.NewTicketSale
import de.stustanet.stustapay.model.PaymentMethod
import de.stustanet.stustapay.model.PendingTicketSale
import de.stustanet.stustapay.model.Ticket
import de.stustanet.stustapay.model.UserTag
import java.lang.Integer.max
import java.util.UUID


/**
 * Which tickets were selected?
 */
data class TicketStatus(
    /**
     * Which buttons were selected how often?
     * Map button-id -> amount.
     */
    var buttonSelection: MutableMap<Int, Int> = mutableMapOf(),

    /**
     * when checking the sale, server returns this.
     */
    var checkedSale: PendingTicketSale? = null,

    /**
     * status serial so objects are different..
     */
    var statusSerial: ULong = 0u,

    /**
     * tags of the sold tickets.
     * we keep the order so we can assign the order to the first one.
     */
    var tags: List<UserTag> = listOf(),
) {
    fun updateWithPendingTicketSale(pendingTicketSale: PendingTicketSale) {
        checkedSale = pendingTicketSale
    }

    fun tagScanStepNumber(): Int {
        return tags.size + 1
    }

    fun tagsScanned(): Int {
        return tags.size
    }

    fun tagScansRequired(): Int {
        return buttonSelection.values.sum()
    }

    fun tagKnown(tag: UserTag): Boolean {
        return tag in tags
    }

    fun tagScanned(tag: UserTag): Boolean {
        return if (tag in tags) {
            false
        } else {
            tags += tag
            statusSerial += 1u
            true
        }
    }

    fun allTagsScanned(): Boolean {
        return tagScansRequired() == tags.size
    }

    fun incrementButton(buttonId: Int) {
        val current = buttonSelection[buttonId]

        if (current != null) {
            buttonSelection[buttonId] = current + 1
        } else {
            buttonSelection += Pair(
                buttonId,
                1
            )
        }

        statusSerial += 1u
    }

    fun decrementButton(buttonId: Int) {
        val current = buttonSelection[buttonId]
        // require re-scan of all tickets if we remove just one.
        tags = listOf()

        if (current != null) {
            val newAmount = max(0, current - 1)
            if (newAmount != 0) {
                buttonSelection[buttonId] = newAmount
            } else {
                buttonSelection.remove(buttonId)
            }
        } else {
            // ignore decrement on unselected ticket
        }

        statusSerial += 1u
    }

    fun getNewTicketSale(paymentMethod: PaymentMethod): NewTicketSale {
        assert(tags.size == buttonSelection.values.sum()) { "not all tags scanned" }

        return NewTicketSale(
            uuid = checkedSale?.uuid ?: UUID.randomUUID().toString(),
            customer_tag_uids = tags.map { it.uid },
            tickets = buttonSelection.filter {
                it.value > 0
            }.map {
                Ticket(till_button_id = it.key, quantity = it.value)
            },
            payment_method = paymentMethod,
        )
    }
}