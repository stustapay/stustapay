package de.stustanet.stustapay.netsource


import de.stustanet.stustapay.model.CompletedTopUp
import de.stustanet.stustapay.model.NewTopUp
import de.stustanet.stustapay.model.PendingTopUp
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class TopUpRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI,
) {
    suspend fun checkTopUp(newOrder: NewTopUp): Response<PendingTopUp> {
        return terminalAPI.checkTopUp(newOrder)
    }

    suspend fun bookTopUp(newOrder: NewTopUp): Response<CompletedTopUp> {
        return terminalAPI.bookTopUp(newOrder)
    }
}