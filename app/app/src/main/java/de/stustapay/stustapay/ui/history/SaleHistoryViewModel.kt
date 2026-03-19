package de.stustapay.stustapay.ui.history

import androidx.lifecycle.viewModelScope
import com.ionspin.kotlin.bignum.integer.BigInteger
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.Order
import de.stustapay.api.models.OrderType
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.CustomerRepository
import de.stustapay.stustapay.repository.SaleRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import de.stustapay.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

sealed interface SaleHistoryFilter {
    object RecentOrders : SaleHistoryFilter
    data class CustomerOrders(val customerTagUid: BigInteger) : SaleHistoryFilter
}

@HiltViewModel
class SaleHistoryViewModel @Inject constructor(
    private val saleRepository: SaleRepository,
    private val customerRepository: CustomerRepository,
    userRepository: UserRepository,
    terminalConfigRepository: TerminalConfigRepository,
) : ViewModel() {
    private val _sales = MutableStateFlow<List<Order>>(listOf())
    val sales = _sales.asStateFlow()

    private val _status = MutableStateFlow<SaleHistoryStatus>(SaleHistoryStatus.Idle)
    val status = _status.asStateFlow()
    private val _cancelStatus = MutableStateFlow<SaleHistoryStatus>(SaleHistoryStatus.Idle)
    val cancelStatus = _cancelStatus.asStateFlow()

    private val _historyFilter = MutableStateFlow<SaleHistoryFilter>(SaleHistoryFilter.RecentOrders)
    val historyFilter = _historyFilter.asStateFlow()

    val canScanCustomerHistory: StateFlow<Boolean> = userRepository.userState
        .map { userState ->
            userState is UserState.LoggedIn && Access.canViewCustomerOrders(userState.user)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(),
            initialValue = false
        )

    private val activeTillId = terminalConfigRepository.terminalConfigState
        .map { configState ->
            if (configState is TerminalConfigState.Success) {
                configState.config.till?.id
            } else {
                null
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(),
            initialValue = null
        )

    fun idleStatus() {
        _status.update { SaleHistoryStatus.Idle }
    }

    fun idleCancelStatus() {
        _cancelStatus.update { SaleHistoryStatus.Idle }
    }

    suspend fun fetchHistory() {
        _historyFilter.update { SaleHistoryFilter.RecentOrders }
        _status.update { SaleHistoryStatus.Fetching }
        when (val sales = saleRepository.listSales()) {
            is Response.OK -> {
                _sales.update {
                    sortOrders(sales.data)
                }
                _status.update { SaleHistoryStatus.Done }
            }

            is Response.Error -> {
                _status.update { SaleHistoryStatus.Failed(sales.msg()) }
            }
        }
    }

    suspend fun fetchHistoryForCustomer(customerTagUid: BigInteger) {
        _status.update { SaleHistoryStatus.Fetching }
        when (val sales = customerRepository.getCustomerOrders(customerTagUid)) {
            is Response.OK -> {
                _sales.update {
                    val tillId = activeTillId.value
                    val filteredOrders = if (tillId != null) {
                        sales.data.filter { it.tillId == tillId }
                    } else {
                        sales.data
                    }
                    sortOrders(filteredOrders)
                }
                _historyFilter.update { SaleHistoryFilter.CustomerOrders(customerTagUid) }
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
        refreshHistory()
    }

    fun canCancelOrder(order: Order): Boolean {
        if (order.orderType != OrderType.sale || order.paymentMethod != PaymentMethod.tag) {
            return false
        }

        return sales.value.none { it.cancelsOrder == order.id }
    }

    private suspend fun refreshHistory() {
        when (val filter = historyFilter.value) {
            SaleHistoryFilter.RecentOrders -> fetchHistory()
            is SaleHistoryFilter.CustomerOrders -> fetchHistoryForCustomer(filter.customerTagUid)
        }
    }

    private fun sortOrders(orders: List<Order>): List<Order> {
        return orders.sortedBy { it.bookedAt.toLocalDateTime() }.reversed()
    }
}

sealed interface SaleHistoryStatus {
    object Idle : SaleHistoryStatus
    object Fetching : SaleHistoryStatus
    object Done : SaleHistoryStatus
    data class Failed(val msg: String) : SaleHistoryStatus
}
