package de.stustanet.stustapay.ui.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.OrderRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import java.lang.Thread.State
import javax.inject.Inject
import kotlinx.coroutines.launch


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
    private val orderRepository: OrderRepository,
    private val terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {
    private val order = MutableStateFlow(mapOf<Int, Int>())
    val status = MutableStateFlow("ready")
    val orderUiState: StateFlow<OrderUiState> = terminalUiConfigState(
        terminalConfigRepository = terminalConfigRepository
    ).stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = OrderUiState()
    )

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
    }

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


    private fun terminalUiConfigState(
        terminalConfigRepository: TerminalConfigRepository,
    ): Flow<OrderUiState> {
        val terminalConfigState: Flow<TerminalConfigState> =
            terminalConfigRepository.terminalConfigState

        return terminalConfigState.asResult()
            .map { terminalConfigStateResult ->
                when (terminalConfigStateResult) {
                    is Result.Success -> {
                        when (val orderUiState = terminalConfigStateResult.data) {
                            is TerminalConfigState.Success -> {
                                status.emit("Terminal config fetched.")
                                OrderUiState(
                                    currentOrder = mapOf<Int, Int>(),
                                    products = orderUiState.config.buttons?.map {
                                        Pair(it.id, TillProductButtonUI(id=it.id, caption = it.name, price = it.price, products = it.product_ids))
                                    }?.toMap() ?: mapOf()
                                )
                            }
                            is TerminalConfigState.Error -> {
                                status.emit(orderUiState.message)
                                OrderUiState(
                                    currentOrder = mapOf<Int, Int>(),
                                    products = mapOf<Int, TillProductButtonUI>()
                                )
                            }
                        }
                    }

                    is Result.Loading -> {
                        status.emit("Loading")
                        OrderUiState(
                            currentOrder = mapOf<Int, Int>(),
                            products = mapOf<Int, TillProductButtonUI>()
                        )
                    }

                    is Result.Error -> {
                        status.emit("Error")
                        OrderUiState(
                            currentOrder = mapOf<Int, Int>(),
                            products = mapOf<Int, TillProductButtonUI>()
                        )
                    }
                }
            }
        }
}
