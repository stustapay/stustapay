package de.stustapay.stustapay.repository

import de.stustapay.stustapay.model.CompletedTopUp
import de.stustapay.stustapay.model.NewTopUp
import de.stustapay.stustapay.model.PendingTopUp
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.netsource.TopUpRemoteDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TopUpRepository @Inject constructor(
    private val TopUpRemoteDataSource: TopUpRemoteDataSource,
) {
    suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp> {
        return TopUpRemoteDataSource.checkTopUp(newTopUp)
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        return TopUpRemoteDataSource.bookTopUp(newTopUp)
    }
}
