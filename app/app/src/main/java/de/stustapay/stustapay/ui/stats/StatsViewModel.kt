package de.stustapay.stustapay.ui.stats

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.RevenueStats
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.repository.MgmtRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.OffsetDateTime
import javax.inject.Inject

@HiltViewModel
class StatsViewModel @Inject constructor(
    private val mgmtRepository: MgmtRepository
) : ViewModel() {
    private val _stats = MutableStateFlow(
        RevenueStats(
            fromTime = OffsetDateTime.now(),
            toTime = OffsetDateTime.now(),
            dailyIntervals = listOf(),
            hourlyIntervals = listOf()
        )
    )
    val stats = _stats.asStateFlow()

    private val _status = MutableStateFlow<StatsStatus>(StatsStatus.Idle)
    val status = _status.asStateFlow()

    private val _currentSubView = MutableStateFlow<StatsSubView>(StatsSubView.Root)
    val currentSubView = _currentSubView.asStateFlow()

    fun goTo(subView: StatsSubView) {
        _currentSubView.update { subView }
    }

    suspend fun fetchHistory() {
        _status.update { StatsStatus.Fetching }
        when (val res = mgmtRepository.getRevenueStats(null, null)) {
            is Response.OK -> {
                _stats.update {
                    res.data
                }
                _status.update { StatsStatus.Done }
            }

            is Response.Error -> {
                _status.update { StatsStatus.Failed(res.msg()) }
            }
        }
    }
}

sealed interface StatsStatus {
    object Idle : StatsStatus
    object Fetching : StatsStatus
    object Done : StatsStatus
    data class Failed(val msg: String) : StatsStatus
}

sealed interface StatsSubView {
    object Root : StatsSubView
    object DailyRevenue : StatsSubView
    object HourlyRevenue : StatsSubView
}