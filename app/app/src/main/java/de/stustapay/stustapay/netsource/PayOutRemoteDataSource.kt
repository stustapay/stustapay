package de.stustapay.stustapay.netsource


import de.stustapay.stustapay.model.CompletedPayOut
import de.stustapay.stustapay.model.NewPayOut
import de.stustapay.stustapay.model.PendingPayOut
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import javax.inject.Inject

class PayOutRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI,
) {
    suspend fun checkPayOut(newPayOut: NewPayOut): Response<PendingPayOut> {
        return terminalAPI.checkPayOut(newPayOut)
    }

    suspend fun bookPayOut(newPayOut: NewPayOut): Response<CompletedPayOut> {
        return terminalAPI.bookPayOut(newPayOut)
    }
}