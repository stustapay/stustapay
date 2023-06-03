package de.stustanet.stustapay.ui.history

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.Order
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.SaleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.ZonedDateTime
import javax.inject.Inject

@HiltViewModel
class SaleHistoryViewModel @Inject constructor(
    private val saleRepository: SaleRepository
) : ViewModel() {
    private val _sales = MutableStateFlow<List<Order>>(listOf())
    val sales = _sales.asStateFlow()

    private val _status = MutableStateFlow<SaleHistoryStatus>(SaleHistoryStatus.Idle)
    val status = _status.asStateFlow()
    private val _cancelStatus = MutableStateFlow<SaleHistoryStatus>(SaleHistoryStatus.Idle)
    val cancelStatus = _cancelStatus.asStateFlow()

    fun idleStatus() {
        _status.update { SaleHistoryStatus.Idle }
    }

    fun idleCancelStatus() {
        _cancelStatus.update { SaleHistoryStatus.Idle }
    }

    suspend fun fetchHistory() {
        _status.update { SaleHistoryStatus.Fetching }
        when (val sales = saleRepository.listSales()) {
            is Response.OK -> {
                _sales.update {
                    sales.data.sortedBy { ZonedDateTime.parse(it.booked_at).toLocalDateTime() }
                        .reversed()
                }
                _status.update { SaleHistoryStatus.Done }
            }

            is Response.Error -> {
                _status.update { SaleHistoryStatus.Failed(sales.msg()) }
            }
        }
    }

    suspend fun cancelSale(id: Int) {
        _cancelStatus.update { SaleHistoryStatus.Fetching }
        when (val resp = saleRepository.cancelSale(id)) {
            is Response.OK -> {
                _cancelStatus.update { SaleHistoryStatus.Done }
            }

            is Response.Error -> {
                _cancelStatus.update { SaleHistoryStatus.Failed(resp.msg()) }
            }
        }
        fetchHistory()
    }
}

sealed interface SaleHistoryStatus {
    object Idle : SaleHistoryStatus
    object Fetching : SaleHistoryStatus
    object Done : SaleHistoryStatus
    data class Failed(val msg: String) : SaleHistoryStatus
}