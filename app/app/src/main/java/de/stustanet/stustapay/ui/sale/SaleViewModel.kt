package de.stustanet.stustapay.ui.sale

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.CompletedSale
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.SaleRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


enum class SalePage(val route: String) {
    ProductSelect("product"),
    Confirm("confirm"),
    Success("done"),
    Error("error"),
}


enum class ScanTarget {
    None,
    CheckSale,
}


@HiltViewModel
class SaleViewModel @Inject constructor(
    private val saleRepository: SaleRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
) : ViewModel() {

    // navigation in views
    private val _navState = MutableStateFlow(SalePage.ProductSelect)
    val navState = _navState.asStateFlow()

    // tag scanning
    private val _enableScan = MutableStateFlow(false)
    val enableScan = _enableScan.asStateFlow()
    private val scanTarget = MutableStateFlow(ScanTarget.None)

    // sale drafting
    private val _saleStatus = MutableStateFlow(SaleStatus())
    val saleStatus = _saleStatus.asStateFlow()

    // when we finished a sale
    private val _saleCompleted = MutableStateFlow<CompletedSale?>(null)
    val saleCompleted = _saleCompleted.asStateFlow()

    // status message
    private val _status = MutableStateFlow("loading")
    val status = _status.asStateFlow()

    // configuration infos from backend
    val saleConfig: StateFlow<SaleConfig> = mapSaleState(
        terminalConfigRepository.terminalConfigState
    )

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
    }

    fun incrementVouchers() {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.incrementVouchers()
            newSale
        }
    }

    fun decrementVouchers() {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.decrementVouchers()
            newSale
        }
    }

    fun incrementButton(buttonId: Int) {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.incrementButton(buttonId, saleConfig.value)
            newSale
        }
    }

    fun decrementButton(buttonId: Int) {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.decrementButton(buttonId, saleConfig.value)
            newSale
        }
    }

    fun adjustPrice(buttonId: Int, newPrice: FreePrice) {
        var setPrice = newPrice
        if (newPrice is FreePrice.Set && newPrice.price == 0u) {
            setPrice = FreePrice.Unset
        }

        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.adjustPrice(
                buttonId = buttonId,
                setPrice = setPrice,
                saleConfig = saleConfig.value
            )
            newSale
        }
    }

    /** called when clicking "back" after the order preview */
    suspend fun editOrder() {
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun clearSale() {
        _saleStatus.update { SaleStatus() }
        scanTarget.update { ScanTarget.None }
        _navState.update { SalePage.ProductSelect }
        _saleCompleted.update { null }
    }

    suspend fun tagScanned(tag: UserTag) {
        // remember the user tag
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.tag = tag
            newSale
        }

        _enableScan.update { false }

        when (scanTarget.value) {
            ScanTarget.CheckSale -> {
                checkSale()
            }
            ScanTarget.None -> {
                // nothing to scan for
            }
        }
    }

    fun clearScannedTag() {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.tag = null
            newSale
        }
    }

    fun tagScanDismissed() {
        _enableScan.update { false }
    }

    fun errorDismissed() {
        // we clear the scanned tag in checkSale already
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun checkSale() {
        val tag = _saleStatus.value.tag
        if (tag == null) {
            _status.update { "Scanning tag..." }
            scanTarget.update { ScanTarget.CheckSale }
            _enableScan.update { true }
            return
        }

        _status.update { "Checking order..." }

        // check if the sale is nice and well
        val response = saleRepository.checkSale(
            _saleStatus.value.getNewSale(tag)
        )

        when (response) {
            is Response.OK -> {
                _saleStatus.update { sale ->
                    val newSale = sale.copy()
                    newSale.updateWithPendingSale(response.data)
                    newSale
                }
                _status.update { "Order validated!" }
                _navState.update { SalePage.Confirm }
            }
            is Response.Error.Service -> {
                // maybe only clear tag for some errors.
                clearScannedTag()
                _navState.update { SalePage.Error }
                _status.update { response.msg() }
            }
            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    suspend fun bookSale() {
        _saleCompleted.update { null }

        val tag = _saleStatus.value.tag
        if (tag == null) {
            _status.update { "No tag scan information" }
            return
        }

        val response = saleRepository.bookSale(
            newSale = _saleStatus.value.getNewSale(tag)
        )

        when (response) {
            is Response.OK -> {
                _status.update { "Success!" }
                _saleCompleted.update { response.data }
                clearSale()
                _navState.update { SalePage.Success }
            }
            is Response.Error.Service -> {
                clearScannedTag()
                _navState.update { SalePage.Error }
                _status.update { response.msg() }
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
                        _status.update { "Ready for order." }
                        SaleConfig(
                            ready = true,
                            buttons = terminalConfig.config.buttons?.associate {
                                Pair(
                                    it.id,
                                    SaleItemConfig(
                                        id = it.id,
                                        caption = it.name,
                                        price = SaleItemPrice.fromTerminalButton(it),
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
                        _status.update { "Loading..." }
                        SaleConfig()
                    }
                }
            }
    }
}
