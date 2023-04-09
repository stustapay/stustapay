package de.stustanet.stustapay.ui.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.OrderRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.*
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

data class OrderConfig(
    /**
     * Can we create a new order?
     */
    var ready: Boolean = false,

    /**
     * How the till configuration is named.
     */
    var tillName: String = "",

    /**
     * available product buttons, in order from top to bottom.
     */
    var buttons: Map<Int, TillProductButtonUI> = mapOf(),
)


data class Order(
    /**
     * Sum of all ordered items.
     */
    var sum: Double = 0.0,

    /**
     * button id -> number of times bought.
     */
    var buttonSelections: Map<Int, Int> = mapOf(),
) {

    private fun updateSum(orderConfig: OrderConfig) {
        sum = buttonSelections.map {
            orderConfig.buttons[it.key]!!.price * it.value
        }.sum()
    }

    fun incrementButton(productID: Int, orderConfig: OrderConfig) {
        if (buttonSelections.contains(productID)) {
            buttonSelections += Pair(productID, buttonSelections[productID]!! + 1)
        } else {
            buttonSelections += Pair(productID, 1)
        }
        updateSum(orderConfig)
    }

    fun decrementButton(productID: Int, orderConfig: OrderConfig) {
        if (buttonSelections.contains(productID)) {
            if (buttonSelections[productID]!! > 0) {
                buttonSelections += Pair(productID, buttonSelections[productID]!! - 1)
            }
        } else {
            buttonSelections += Pair(productID, 0)
        }
        updateSum(orderConfig)
    }
}

enum class OrderPage(val route: String) {
    ProductSelect("product"),
    Confirm("confirm"),
    Done("done"),
    Aborted("aborted"),
}

@HiltViewModel
class OrderViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {

    val navState = MutableStateFlow(OrderPage.ProductSelect)
    val order = MutableStateFlow(Order())

    val status = MutableStateFlow("loading")

    // infos from backend
    val orderConfig: StateFlow<OrderConfig> = terminalUIConfigState(
        terminalConfigRepository.terminalConfigState
    )

    /** order we received from the server */
    private var serverOrder : PendingOrder? = null

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
    }

    fun incrementOrderProduct(product: Int) {
        order.update { order ->
            val newOrder = order.copy()
            newOrder.incrementButton(product, orderConfig.value)
            newOrder
        }
    }

    fun decrementOrderProduct(product: Int) {
        order.update { order ->
            val newOrder = order.copy()
            newOrder.decrementButton(product, orderConfig.value)
            newOrder
        }
    }

    suspend fun editOrder() {
        // TODO: enter edit mode in selection view
        navState.emit(OrderPage.ProductSelect)
    }

    suspend fun clearOrder() {
        serverOrder = null
        order.update { Order() }
        navState.emit(OrderPage.ProductSelect)
    }

    suspend fun submitOrder(uid: ULong) {
        // transform buttons to products
        var positions = mutableMapOf<Int, Int>()
        for (selection in order.value.buttonSelections) {
            for (productID in orderConfig.value.buttons[selection.key]!!.products) {
                positions[productID] = positions.getOrDefault(productID, 0) + selection.value
            }
        }

        val response = orderRepository.createOrder(
            newOrder = NewOrder(
                // TODO free-price items
                positions = positions.map {
                    NewLineItem(product_id = it.key, quantity = it.value)
                },
                order_type = OrderType.sale,
                customer_tag = uid,
            )
        )

        when (response) {
            is Response.OK -> {
                status.emit("created order id=${response.data.id}")
                // TODO: maybe the response contains already an error
                //       then we have to go to another page.
                serverOrder = response.data
                navState.emit(OrderPage.Confirm)
            }
            is Response.Error -> {
                status.emit(response.msg())
            }
        }
    }

    suspend fun bookOrder() {
        if (serverOrder == null) {
            status.emit("server order id not known")
            return
        }

        val response = orderRepository.processOrder(
            id = serverOrder?.id ?: -1
        )
        when (response) {
            is Response.OK -> {
                status.emit("order booked: old balance=${response.data.old_balance} new balance=${response.data.new_balance}")
                navState.emit(OrderPage.Done)
            }
            is Response.Error -> {
                status.emit(response.msg())
            }
        }
    }

    private fun terminalUIConfigState(
        terminalConfigFlow : StateFlow<TerminalConfigState>,
    ): StateFlow<OrderConfig> {

        return terminalConfigFlow
            .mapState(OrderConfig(), viewModelScope) { terminalConfig ->
                when (terminalConfig) {
                    is TerminalConfigState.Success -> {
                        status.emit("Terminal config fetched.")
                        OrderConfig(
                            ready = true,
                            buttons = terminalConfig.config.buttons?.associate {
                                Pair(
                                    it.id,
                                    TillProductButtonUI(
                                        id = it.id,
                                        caption = it.name,
                                        price = it.price,
                                        products = it.product_ids
                                    )
                                )
                            } ?: mapOf(),
                            tillName = terminalConfig.config.name,
                        )
                    }
                    is TerminalConfigState.Error -> {
                        status.emit(terminalConfig.message)
                        OrderConfig()
                    }
                    is TerminalConfigState.Loading -> {
                        status.emit("Loading")
                        OrderConfig()
                    }
                }
            }
    }
}
