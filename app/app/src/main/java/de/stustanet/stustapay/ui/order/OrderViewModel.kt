package de.stustanet.stustapay.ui.order

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NewLineItem
import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.OrderType
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
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
    private val order = MutableStateFlow(mapOf<Int, Int>())
    val status = MutableStateFlow("ready")

    private val products = mapOf<Int, TillProductButtonUI>(
        Pair(1, TillProductButtonUI(0, "Bier", 3.5, listOf(0, 10))),
        Pair(1, TillProductButtonUI(1, "Mass", 6.0, listOf(1, 10))),
        Pair(2, TillProductButtonUI(2, "Weißbier", 3.5, listOf(2, 10))),
        Pair(3, TillProductButtonUI(3, "Radler", 3.5, listOf(3, 10))),
        Pair(4, TillProductButtonUI(4, "Spezi", 3.5, listOf(4, 10))),
        Pair(11, TillProductButtonUI(11, "Pfand zurück", -2.0, listOf(11))),
    )

    val orderUiState = order.map { currentOrder ->
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
        if (order.value.contains(product)) {
            order.value += Pair(product, order.value[product]!! + 1)
        } else {
            order.value += Pair(product, 1)
        }
    }

    fun decrementOrderProduct(product: Int) {
        if (order.value.contains(product)) {
            if (order.value[product]!! > 0) {
                order.value += Pair(product, order.value[product]!! - 1)
            }
        } else {
            order.value += Pair(product, 0)
        }
    }

    fun clearOrder() {
        order.value = HashMap()
    }

    suspend fun submitOrder() {
        status.emit("submitting...")

        val response = orderRepository.createOrder(
            newOrder = NewOrder(
                // TODO: create real line items
                positions = listOf(NewLineItem(0, 1)),
                order_type = OrderType.sale,
                customer_tag = 1337,
            )
        )
        when (response) {
            is Response.OK -> {
                status.emit("created order id=${response.data.id}")
            }
            is Response.Error -> {
                status.emit(response.msg())
            }
        }
    }
}
