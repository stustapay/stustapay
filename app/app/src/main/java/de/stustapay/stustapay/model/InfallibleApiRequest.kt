package de.stustapay.stustapay.model

import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp
import de.stustapay.libssp.net.Response
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
                "Ticket sale for " + this.kind.content.customerTags.joinToString { it.tagPin }
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

sealed class InfallibleResult<out T> {
    data class OK<T>(val data: Response<T>) : InfallibleResult<T>()
    data class TooManyTries(val tries: Int, val lasterror: Response.Error) :
        InfallibleResult<Nothing>()
}