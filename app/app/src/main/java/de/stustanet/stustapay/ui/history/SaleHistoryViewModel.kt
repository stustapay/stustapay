package de.stustanet.stustapay.ui.history

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.SaleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.LocalDateTime
import java.time.ZonedDateTime
import javax.inject.Inject

@HiltViewModel
class SaleHistoryViewModel @Inject constructor(
    private val saleRepository: SaleRepository
) : ViewModel() {
    private val _sales = MutableStateFlow(List(0) { SaleHistoryEntry() })
    val sales = _sales.asStateFlow()

    suspend fun fetchHistory() {
        when (val sales = saleRepository.listSales()) {
            is Response.OK -> {
                _sales.update {
                    sales.data.map {
                        SaleHistoryEntry(
                            id = it.id,
                            timestamp = ZonedDateTime.parse(it.booked_at).toLocalDateTime(),
                            amount = it.total_price
                        )
                    }.sortedBy { it.timestamp }.reversed()
                }
            }
            else -> {}
        }
    }

    suspend fun cancelSale(id: Int) {
        // TODO: Reverse the order in the backend
    }
}

data class SaleHistoryEntry(
    val id: Int = 0,
    val timestamp: LocalDateTime = LocalDateTime.MIN,
    val amount: Double = 0.0
)