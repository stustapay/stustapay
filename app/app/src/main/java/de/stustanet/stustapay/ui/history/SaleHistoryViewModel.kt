package de.stustanet.stustapay.ui.history

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.LineItem
import de.stustanet.stustapay.model.Order
import de.stustanet.stustapay.model.OrderType
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
    private val _sales = MutableStateFlow<List<Order>>(listOf())
    val sales = _sales.asStateFlow()

    suspend fun fetchHistory() {
        when (val sales = saleRepository.listSales()) {
            is Response.OK -> {
                _sales.update {
                    sales.data.sortedBy { ZonedDateTime.parse(it.booked_at).toLocalDateTime() }.reversed()
                }
            }
            else -> {}
        }
    }

    suspend fun cancelSale(id: Int) {
        saleRepository.cancelSale(id)
        fetchHistory()
    }
}