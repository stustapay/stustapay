package de.stustapay.stustapay.netsource


import de.stustapay.stustapay.model.CompletedTopUp
import de.stustapay.stustapay.model.NewTopUp
import de.stustapay.stustapay.model.PendingTopUp
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import javax.inject.Inject

class TopUpRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI,
) {
    suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp> {
        return terminalAPI.checkTopUp(newTopUp)
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        return terminalAPI.bookTopUp(newTopUp)
    }
}