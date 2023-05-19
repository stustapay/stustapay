package de.stustanet.stustapay.netsource


import de.stustanet.stustapay.model.CompletedPayOut
import de.stustanet.stustapay.model.NewPayOut
import de.stustanet.stustapay.model.PendingPayOut
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
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