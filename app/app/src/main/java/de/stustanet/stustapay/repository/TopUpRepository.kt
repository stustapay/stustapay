package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.CompletedTopUp
import de.stustanet.stustapay.model.NewTopUp
import de.stustanet.stustapay.model.PendingTopUp
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.TopUpRemoteDataSource
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
