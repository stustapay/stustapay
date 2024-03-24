package de.stustapay.stustapay.model

import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.NewTicketSale
import java.util.UUID

data class InfallibleApiRequests(
    val requests: Map<UUID, InfallibleApiRequest>
)

data class InfallibleApiRequest(
    val kind: InfallibleApiRequestKind
)

sealed interface InfallibleApiRequestKind {
    data class TopUp(
        val content: NewTopUp
    ) : InfallibleApiRequestKind

    data class TicketSale(
        val content: NewTicketSale
    ) : InfallibleApiRequestKind
}