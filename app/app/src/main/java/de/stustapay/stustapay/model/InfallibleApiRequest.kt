package de.stustapay.stustapay.model

import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.NewTicketSale
import java.util.UUID

data class InfallibleApiRequests(
    val requests: Map<UUID, InfallibleApiRequest>
)

data class InfallibleApiRequest(
    val kind: InfallibleApiRequestKind
) {
    fun msg(): String {
        return when (this.kind) {
            is InfallibleApiRequestKind.TicketSale -> {
                "Ticket sale for " + this.kind.content.customerTagUids.joinToString { it.toString() }
            }
            is InfallibleApiRequestKind.TopUp -> {
                "Top-Up of " + this.kind.content.amount + "€ for " + this.kind.content.customerTagUid.toString()
            }
        }
    }
}

sealed interface InfallibleApiRequestKind {
    data class TopUp(
        val content: NewTopUp
    ) : InfallibleApiRequestKind

    data class TicketSale(
        val content: NewTicketSale
    ) : InfallibleApiRequestKind
}