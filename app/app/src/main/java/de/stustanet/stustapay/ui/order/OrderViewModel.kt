package de.stustanet.stustapay.ui.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.SaleRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.*
import javax.inject.Inject


/**
 * button available for purchase.
 */
data class SelectionButton(
    val id: Int,
    val caption: String,
    val price: Double?,
    val defaultPrice: Double?,
)


/**
 * What can be ordered?
 */
data class SaleConfig(
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
     * map button id -> button config.
     */
    var buttons: Map<Int, SelectionButton> = mapOf(),
)


/**
 * What was ordered?
 * This is converted to a NewOrder for server submission.
 * This is updated from the PendingOrder after a server check.
 */
data class DraftSale(
    /**
     * Sum of all ordered items.
     */
    var sum: Double = 0.0,

    /**
     * How many vouchers were selected?
     */
    var used_vouchers: Int? = null,

    /**
     * Which buttons were selected how often?
     * Converted into NewLineItem for the associated product ids.
     *
     * Map button-id -> count.
     */
    var fixPricePositions: Map<Int, Int> = mapOf(),

    /**
     * button-id -> last selected price.
     */
    var freePricePositions: Map<Int, Double> = mapOf(),
) {

    private fun updateSum(saleConfig: SaleConfig) {
        sum = fixPricePositions.map {
            saleConfig.buttons[it.key]!!.price * it.value
        }.sum()
    }

    fun incrementButton(productID: Int, saleConfig: SaleConfig) {
        val currentAmount = fixPricePositions[productID]
        fixPricePositions += if (currentAmount != null) {
            Pair(productID, currentAmount + 1)
        } else {
            Pair(productID, 1)
        }
        updateSum(saleConfig)
    }

    fun decrementButton(productID: Int, saleConfig: SaleConfig) {
        val currentAmount = fixPricePositions[productID]
        if (currentAmount != null) {
            if (currentAmount > 0) {
                fixPricePositions += Pair(productID, currentAmount - 1)
                updateSum(saleConfig)
            }
        }
    }

    fun createOrder(tag: UserTag): NewSale {
        return NewSale(
            buttons = fixPricePositions.filter { it.value > 0 }.map {
                Button(
                    till_button_id = it.key,
                    quantity = it.value,
                )
            } + freePricePositions.filter { it.value > 0 }.map {
                Button(
                    till_button_id = it.key,
                    quantity = null,
                    price = it.value,
                )
            },
            customer_tag_uid = tag.uid,
        )
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
    private val saleRepository: SaleRepository,
    private val terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {

    val navState = MutableStateFlow(OrderPage.ProductSelect)

    private val _saleState = MutableStateFlow(DraftSale())
    val saleState = _saleState.asStateFlow()

    private val _status = MutableStateFlow("loading")
    val status = _status.asStateFlow()

    // infos from backend
    val saleConfig: StateFlow<SaleConfig> = mapSaleState(
        terminalConfigRepository.terminalConfigState
    )

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
    }

    fun incrementButton(buttonId: Int) {
        _saleState.update { sale ->
            val newSale = sale.copy()
            newSale.incrementButton(buttonId, saleConfig.value)
            newSale
        }
    }

    fun decrementButton(buttonId: Int) {
        _saleState.update { order ->
            val newOrder = order.copy()
            newOrder.decrementButton(buttonId, saleConfig.value)
            newOrder
        }
    }

    /** called when clicking "back" after the order preview */
    suspend fun editOrder() {
        // TODO: enter edit mode in selection view
        navState.update { OrderPage.ProductSelect }
    }

    suspend fun clearOrder() {
        _saleState.update { DraftSale() }
        navState.update { OrderPage.ProductSelect }
    }

    suspend fun submitOrder(tag: UserTag) {
        // transform buttons to products
        var positions = mutableMapOf<Int, Int>()
        for (selection in _saleState.value.fixPricePositions) {
            for (productID in saleConfig.value.buttons[selection.key]!!.products) {
                positions[productID] = positions.getOrDefault(productID, 0) + selection.value
            }
        }

        val response = saleRepository.createSale(
            newSale =
        )

        when (response) {
            is Response.OK -> {
                _status.update { "created order id=${response.data.id}" }
                navState.update { OrderPage.Confirm }
            }
            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    suspend fun bookOrder() {

        val response = saleRepository.bookSale(
            asdf
        )

        when (response) {
            is Response.OK -> {
                _status.update { "order booked: old balance=${response.data.old_balance} new balance=${response.data.new_balance}" }
                navState.update { OrderPage.Done }
            }
            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    private fun mapSaleState(
        terminalConfigFlow: StateFlow<TerminalConfigState>,
    ): StateFlow<SaleConfig> {

        return terminalConfigFlow
            .mapState(SaleConfig(), viewModelScope) { terminalConfig ->
                when (terminalConfig) {
                    is TerminalConfigState.Success -> {
                        _status.update { "Terminal config fetched." }
                        SaleConfig(
                            ready = true,
                            buttons = terminalConfig.config.buttons?.associate {
                                Pair(
                                    it.id,
                                    SelectionButton(
                                        id = it.id,
                                        caption = it.name,
                                        price = it.price,
                                        defaultPrice = it.default_price,
                                    )
                                )
                            } ?: mapOf(),
                            tillName = terminalConfig.config.name,
                        )
                    }
                    is TerminalConfigState.Error -> {
                        _status.update { terminalConfig.message }
                        SaleConfig()
                    }
                    is TerminalConfigState.Loading -> {
                        _status.update { "Loading" }
                        SaleConfig()
                    }
                }
            }
    }
}
