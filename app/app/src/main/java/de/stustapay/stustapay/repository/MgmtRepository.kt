package de.stustapay.stustapay.repository

import de.stustapay.api.models.RevenueStats
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.netsource.MgmtRemoteDataSource
import java.time.OffsetDateTime
import javax.inject.Inject

class MgmtRepository @Inject constructor(
    private val mgmtRemoteDataSource: MgmtRemoteDataSource
) {
    suspend fun getRevenueStats(
        fromTime: OffsetDateTime?, toTime: OffsetDateTime?
    ): Response<RevenueStats> {
        return mgmtRemoteDataSource.getRevenueStats(fromTime, toTime)
    }
}