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



sealed interface SaleItemAmount {
    data class FreePrice(val price: Double, val defaultPrice: Double?) : SaleItemAmount
    data class FixedPrice(val price: Double, val amount: Int) : SaleItemAmount
    companion object {
        fun fromTerminalButton(button: TerminalButton): SaleItemAmount {
            return if (button.fixed_price) {
                FixedPrice(price = button.price ?: 0.0, amount = 0)
            } else {
                FreePrice(price = 0.0, defaultPrice = button.default_price)
            }
        }
    }
}



/**
 * button available for purchase.
 */
data class SaleItemButton(
    val id: Int,
    val caption: String,
    val amount: SaleItemAmount,
    val returnable: Boolean,
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
    var buttons: Map<Int, SaleItemButton> = mapOf(),
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
     * If it's a free-price button, store the entered value.
     *
     * Map button-id -> button.
     */
    var buttonSelection: Map<Int, Button> = mapOf(),

    /**
     * if we have used the server for checking the sale, this is what it returned to us.
     */
    var checkedSale: PendingSale? = null,
) {

    /**
     * calculate the sum of money needed for this draft order.
     * this sums up all button presses for fixed and free-price items.
     */
    private fun updateSum(saleConfig: SaleConfig) {
        var newSum = 0.0
        for (button in buttonSelection) {
            val amount = saleConfig.buttons[button.key]?.amount
            newSum += when (amount) {
                is SaleItemAmount.FixedPrice -> {
                    amount.amount * amount.price
                }
                is SaleItemAmount.FreePrice -> {
                    amount.price
                }
                null -> {
                    0.0
                }
            }
        }
        sum = newSum
    }

    fun incrementButton(buttonId: Int, saleConfig: SaleConfig) {
        val current = buttonSelection[buttonId]
        if (current == null) {
            buttonSelection += Pair(buttonId, Button(till_button_id = buttonId, quantity = 1))
        } else {
            current.quantity = current.quantity!! + 1
        }
        updateSum(saleConfig)
    }

    fun decrementButton(buttonId: Int, saleConfig: SaleConfig) {
        val current = buttonSelection[buttonId]
        if (current != null) {
            current.quantity = current.quantity!! - 1
        }
        updateSum(saleConfig)
    }

    fun getNewSale(tag: UserTag): NewSale {
        return NewSale(
            buttons = buttonSelection.values.toList(),
            customer_tag_uid = tag.uid,
        )
    }

    /** when the server reports back from the newsale check */
    fun integrateCheck(checkedSale: PendingSale) {

    }
}

enum class SalePage(val route: String) {
    ProductSelect("product"),
    Confirm("confirm"),
    Done("done"),
    Aborted("aborted"),
}


sealed interface SaleState {
    object InitialSelect : SaleState
}


@HiltViewModel
class OrderViewModel @Inject constructor(
    private val saleRepository: SaleRepository,
    private val terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {

    private val _navState = MutableStateFlow(SalePage.ProductSelect)
    val navState = _navState.asStateFlow()

    private val _saleDraft = MutableStateFlow(DraftSale())
    val saleDraft = _saleDraft.asStateFlow()

    private val _saleState = MutableStateFlow<SaleState>(SaleState.InitialSelect)
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
        _saleDraft.update { sale ->
            val newSale = sale.copy()
            newSale.incrementButton(buttonId, saleConfig.value)
            newSale
        }
    }

    fun decrementButton(buttonId: Int) {
        _saleDraft.update { sale ->
            val newSale = sale.copy()
            newSale.decrementButton(buttonId, saleConfig.value)
            newSale
        }
    }

    /** called when clicking "back" after the order preview */
    suspend fun editOrder() {
        // TODO: enter edit mode in selection view
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun clearOrder() {
        _saleDraft.update { DraftSale() }
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun checkSale(tag: UserTag) {
        // check if the sale is nice and well
        val response = saleRepository.checkSale(
            _saleDraft.value.getNewSale(tag)
        )

        when (response) {
            is Response.OK -> {
                _saleDraft.update { sale ->
                    val newSale = sale.copy()
                    newSale.integrateCheck(response.data)
                    newSale
                }
                _status.update { "order validated" }
                _navState.update { SalePage.Confirm }
            }
            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    suspend fun bookSale() {
        val response = saleRepository.bookSale(
            newSale = _saleDraft.value.getNewSale(UserTag(0UL))
        )

        when (response) {
            is Response.OK -> {
                _status.update { "order booked: old balance=${response.data.old_balance} new balance=${response.data.new_balance}" }
                _navState.update { SalePage.Done }
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
                                    SaleItemButton(
                                        id = it.id,
                                        caption = it.name,
                                        amount = SaleItemAmount.fromTerminalButton(it),
                                        returnable = it.is_returnable,
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
