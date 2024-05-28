package de.stustapay.stustapay.ui.sale

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CompletedSale
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.repository.SaleRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


enum class SalePage(val route: String) {
    ProductSelect("product"), Confirm("confirm"), Success("done"), Error("error"),
}


enum class ScanTarget {
    None, CheckSale,
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

    // error popup
    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    // configuration infos from backend
    val saleConfig: StateFlow<SaleConfig> = mapSaleConfig(
        terminalConfigRepository.terminalConfigState
    )

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
                buttonId = buttonId, setPrice = setPrice, saleConfig = saleConfig.value
            )
            newSale
        }
    }

    /** called when clicking "back" after the order preview */
    suspend fun editOrder() {
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun clearSale(success: Boolean = false) {
        _saleStatus.update { SaleStatus() }
        scanTarget.update { ScanTarget.None }
        _navState.update { SalePage.ProductSelect }
        _saleCompleted.update { null }
        if (success) {
            _status.update { "Order cleared - ready." }
        } else {
            _status.update { "Order cleared" }
        }
    }

    suspend fun tagScanned(tag: NfcTag) {
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

    private fun clearScannedTag() {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.tag = null
            newSale
        }
    }

    fun tagScanDismissed() {
        _enableScan.update { false }
    }

    fun errorPopupDismissed() {
        _error.update { null }
    }

    fun errorPageDismissed() {
        // we clear the scanned tag in checkSale already
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun checkSale() {
        if (_saleStatus.value.buttonSelection.isEmpty()) {
            _status.update { "Nothing ordered!" }
            return
        }

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
                _error.update { response.msg() }
                _status.update { response.msg() }
            }

            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    suspend fun bookSale() {
        val tag = _saleStatus.value.tag
        if (tag == null) {
            _status.update { "No tag scan information" }
            return
        }

        _saleCompleted.update { null }

        val response = saleRepository.bookSale(
            newSale = _saleStatus.value.getNewSale(tag)
        )

        when (response) {
            is Response.OK -> {
                // delete the sale draft
                clearSale()
                _status.update { "Order booked!" }
                // now we have a completed sale
                _saleCompleted.update { response.data }
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

    private fun mapSaleConfig(
        terminalConfigFlow: StateFlow<TerminalConfigState>,
    ): StateFlow<SaleConfig> {

        return terminalConfigFlow.mapState(SaleConfig(), viewModelScope) { terminalConfig ->
            when (terminalConfig) {
                is TerminalConfigState.Success -> {
                    _status.update { "Ready for order." }
                    SaleConfig(
                        ready = true,
                        buttons = terminalConfig.config.till?.buttons?.associate {
                            Pair(
                                it.id.intValue(), SaleItemConfig(
                                    id = it.id.intValue(),
                                    caption = it.name,
                                    price = SaleItemPrice.fromTerminalButton(it),
                                    returnable = it.isReturnable,
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

                is TerminalConfigState.NoConfig -> {
                    _status.update { "Loading..." }
                    SaleConfig()
                }
            }
        }
    }
}
