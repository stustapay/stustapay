package de.stustapay.stustapay.repository

import de.stustapay.api.models.CompletedPayOut
import de.stustapay.api.models.NewPayOut
import de.stustapay.api.models.PendingPayOut
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.netsource.PayOutRemoteDataSource
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