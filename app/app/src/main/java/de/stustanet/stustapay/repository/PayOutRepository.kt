package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.CompletedPayOut
import de.stustanet.stustapay.model.NewPayOut
import de.stustanet.stustapay.model.PendingPayOut
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.PayOutRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PayOutRepository @Inject constructor(
    private val payOutRemoteDataSource: PayOutRemoteDataSource
) {
    suspend fun checkPayOut(newPayOut: NewPayOut): Response<PendingPayOut> {
        return payOutRemoteDataSource.checkPayOut(newPayOut);
    }

    suspend fun bookPayOut(newPayOut: NewPayOut): Response<CompletedPayOut> {
        return payOutRemoteDataSource.bookPayOut(newPayOut)
    }
}