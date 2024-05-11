package de.stustapay.stustapay.netsource

import de.stustapay.api.models.CompletedTopUp
import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.PendingTopUp
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

class TopUpRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp> {
        return terminalApiAccessor.execute { it.order()?.checkTopup(newTopUp) }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        return terminalApiAccessor.execute { it.order()?.bookTopup(newTopUp) }
    }
}