package de.stustapay.stustapay.netsource

import de.stustapay.api.models.CompletedTopUp
import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.PendingTopUp
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import de.stustapay.stustapay.net.execute
import javax.inject.Inject

class TopUpRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp> {
        return terminalApiAccessor.execute { terminalApiAccessor.order().checkTopup(newTopUp) }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        return terminalApiAccessor.execute { terminalApiAccessor.order().bookTopup(newTopUp) }
    }
}