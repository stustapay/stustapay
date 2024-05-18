package de.stustapay.stustapay.netsource

import de.stustapay.api.models.RevenueStats
import de.stustapay.api.models.TimeseriesStatsQuery
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import java.time.OffsetDateTime
import javax.inject.Inject

class MgmtRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun getRevenueStats(
        fromTime: OffsetDateTime?, toTime: OffsetDateTime?
    ): Response<RevenueStats> {
        return terminalApiAccessor.execute {
            it.mgmt()?.getRevenueStats(TimeseriesStatsQuery(fromTime, toTime))
        }
    }
}