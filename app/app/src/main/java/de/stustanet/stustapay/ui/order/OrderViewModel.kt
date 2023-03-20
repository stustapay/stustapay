package de.stustanet.stustapay.ui.order

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NewLineItem
import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.OrderType
import de.stustanet.stustapay.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import java.util.SortedMap
import javax.inject.Inject


/**
 * button available for purchase.
 * it contains one or many products, e.g. bier + pfand.
 */
data class TillProductButtonUI(
    val id: Int,
    val caption: String,
    val price: Double,
    val products: List<Int>,
)

data class OrderUiState(
    /**
     * product id -> number of times bought.
     */
    var currentOrder: Map<Int, Int> = mapOf(),

    /**
     * available product buttons, in order from top to bottom.
     */
    var products: Map<Int, TillProductButtonUI> = mapOf(),
)

@HiltViewModel
class OrderViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {
    private val _currentOrder = MutableStateFlow(mapOf<Int, Int>())

    private val products = mapOf<Int, TillProductButtonUI>(
        Pair(1, TillProductButtonUI(0, "Bier", 3.5, listOf(0, 10))),
        Pair(1, TillProductButtonUI(1, "Mass", 6.0, listOf(1, 10))),
        Pair(2, TillProductButtonUI(2, "Weißbier", 3.5, listOf(2, 10))),
        Pair(3, TillProductButtonUI(3, "Radler", 3.5, listOf(3, 10))),
        Pair(4, TillProductButtonUI(4, "Spezi", 3.5, listOf(4, 10))),
        Pair(11, TillProductButtonUI(11, "Pfand zurück", -2.0, listOf(11))),
    )

    val uiState = _currentOrder.map { currentOrder ->
        OrderUiState(
            currentOrder = currentOrder,
            products = products
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = OrderUiState()
    )

    fun incrementOrderProduct(product: Int) {
        if (_currentOrder.value.contains(product)) {
            _currentOrder.value += Pair(product, _currentOrder.value[product]!! + 1)
        } else {
            _currentOrder.value += Pair(product, 1)
        }
    }

    fun decrementOrderProduct(product: Int) {
        if (_currentOrder.value.contains(product)) {
            if (_currentOrder.value[product]!! > 0) {
                _currentOrder.value += Pair(product, _currentOrder.value[product]!! - 1)
            }
        } else {
            _currentOrder.value += Pair(product, 0)
        }
    }

    fun clearOrder() {
        _currentOrder.value = HashMap()
    }

    suspend fun submitOrder() {
        Log.i("stustapay", "orderviewmodel: submit order")
        orderRepository.createOrder(
            newOrder = NewOrder(
                positions = listOf(NewLineItem(0, 1)),
                order_type = OrderType.sale,
                customer_tag = 1337,
            )
        )
    }
}
