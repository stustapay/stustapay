package de.stustapay.stustapay.model

import java.util.UUID
import de.stustapay.api.models.NewTopUp

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
}