package de.stustapay.stustapay.netsource


import de.stustapay.api.models.CompletedPayOut
import de.stustapay.api.models.NewPayOut
import de.stustapay.api.models.PendingPayOut
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import de.stustapay.stustapay.net.execute
import javax.inject.Inject

class PayOutRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun checkPayOut(newPayOut: NewPayOut): Response<PendingPayOut> {
        return terminalApiAccessor.execute {
            it.order().checkPayout(newPayOut)
        }
    }

    suspend fun bookPayOut(newPayOut: NewPayOut): Response<CompletedPayOut> {
        return terminalApiAccessor.execute {
            it.order().bookPayout(newPayOut)
        }
    }
}