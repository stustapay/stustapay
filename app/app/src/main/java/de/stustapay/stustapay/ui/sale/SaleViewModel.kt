package de.stustapay.stustapay.ui.sale

import android.app.Activity
import android.content.Context
import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ionspin.kotlin.bignum.integer.BigInteger
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CompletedSale
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.repository.ECPaymentRepository
import de.stustapay.stustapay.repository.ECPaymentResult
import de.stustapay.stustapay.repository.SaleRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import de.stustapay.stustapay.display.CustomerDisplayManager
import de.stustapay.stustapay.display.CustomerDisplayState
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.text.NumberFormat
import java.util.Locale
import javax.inject.Inject

internal data class InsufficientFundsDetails(
    val neededAmount: Double,
    val availableAmount: Double,
)

private val insufficientFundsPrefix = Regex("Not enough funds available", RegexOption.IGNORE_CASE)
private val neededAmountRegex = Regex("Needed: ([0-9.]+)")
private val availableAmountRegex = Regex("Available: ([0-9.]+)")

internal fun parseInsufficientFundsDetails(message: String): InsufficientFundsDetails? {
    if (!insufficientFundsPrefix.containsMatchIn(message)) {
        return null
    }

    val neededAmount = neededAmountRegex.find(message)?.groupValues?.getOrNull(1)?.toDoubleOrNull()
    val availableAmount = availableAmountRegex.find(message)?.groupValues?.getOrNull(1)?.toDoubleOrNull()

    return if (neededAmount != null && availableAmount != null) {
        InsufficientFundsDetails(
            neededAmount = neededAmount,
            availableAmount = availableAmount,
        )
    } else {
        null
    }
}


enum class SalePage(val route: String) {
    ProductSelect("product"),
    Confirm("confirm"),
    ConfirmCash("confirm_cash"),
    ConfirmCard("confirm_card"),
    Success("done"),
    Error("error"),
}


enum class ScanTarget {
    None, CheckSale,
}


@HiltViewModel
class SaleViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val saleRepository: SaleRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val ecPaymentRepository: ECPaymentRepository,
    private val customerDisplayManager: CustomerDisplayManager,
) : ViewModel() {
    private val saleAmountLocale: Locale by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.resources.configuration.locales[0]
        } else {
            @Suppress("DEPRECATION")
            context.resources.configuration.locale
        }
    }

    private val saleAmountNumberFormat: NumberFormat by lazy {
        NumberFormat.getNumberInstance(saleAmountLocale).apply {
            minimumFractionDigits = 2
            maximumFractionDigits = 2
        }
    }

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
    private val _status = MutableStateFlow("")
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
        
        // Update customer display with current products
        updateCustomerDisplayWithCurrentProducts()
    }

    fun decrementButton(buttonId: Int) {
        _saleStatus.update { sale ->
            val newSale = sale.copy()
            newSale.decrementButton(buttonId, saleConfig.value)
            newSale
        }
        
        // Update customer display with current products
        updateCustomerDisplayWithCurrentProducts()
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
        
        // Update customer display with current products
        updateCustomerDisplayWithCurrentProducts()
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
        
        // Reset customer display to welcome state
        customerDisplayManager.updateState(CustomerDisplayState.Welcome)
        
        if (success) {
            _status.update { context.getString(R.string.sale_status_order_cleared_ready) }
        } else {
            _status.update { context.getString(R.string.ticket_order_cleared) }
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
        // Reset customer display to welcome state
        customerDisplayManager.updateState(CustomerDisplayState.Welcome)
        
        // we clear the scanned tag in checkSale already
        _navState.update { SalePage.ProductSelect }
    }

    suspend fun checkSale() {
        // important to check for the list entries
        // and not fold them and check if sum == 0
        // because one can have negative returnable items!
        if (_saleStatus.value.buttonSelection.isEmpty()) {
            _error.update { context.getString(R.string.sale_status_no_items) }
            _navState.update { SalePage.Error }
            return
        }

        // Get the products information for display
        val productsList = _saleStatus.value.buttonSelection.map { (buttonId, amount) ->
            val buttonConfig = saleConfig.value.getButtonConfig(buttonId)
            val quantity = when (amount) {
                is SaleItemAmount.FixedPrice -> amount.amount.toString()
                is SaleItemAmount.FreePrice -> "1x"
            }
            Pair(buttonConfig?.caption ?: "Unknown", quantity)
        }

        // Show validation state on customer display
        val checkedSale = _saleStatus.value.checkedSale
        customerDisplayManager.updateState(
            CustomerDisplayState.ValidatingSale(
                totalPrice = checkedSale?.totalPrice?.toString() ?: "0",
                currentBalance = checkedSale?.oldBalance?.toString() ?: "0",
                newBalance = checkedSale?.newBalance?.toString(),
                products = productsList
            )
        )

        val tag = _saleStatus.value.tag
        if (tag == null) {
            _status.update { context.getString(R.string.sale_status_scanning_tag) }
            scanTarget.update { ScanTarget.CheckSale }
            _enableScan.update { true }
            
            // Update customer display to show scan chip message
            customerDisplayManager.updateState(CustomerDisplayState.ScanChip)
            
            return
        }

        _status.update { context.getString(R.string.order_checking) }

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
                _status.update { context.getString(R.string.sale_status_order_validated) }
                
                // Update customer display with the validated sale
                val pendingSale = response.data
                val productsList = pendingSale.lineItems.map { item ->
                    Pair<String, String>(item.product.name, "${item.quantity}x")
                }
                
                customerDisplayManager.updateState(
                    CustomerDisplayState.ValidatingSale(
                        totalPrice = pendingSale.totalPrice.toString(),
                        currentBalance = pendingSale.oldBalance.toString(),
                        newBalance = pendingSale.newBalance.toString(),
                        products = productsList
                    )
                )
                
                _navState.update { SalePage.Confirm }
            }

            is Response.Error.Service -> {
                val insufficientFundsDetails = parseInsufficientFundsDetails(response.msg())

                if (insufficientFundsDetails != null) {
                    customerDisplayManager.updateState(
                        CustomerDisplayState.InsufficientFunds(
                            totalPrice = insufficientFundsDetails.neededAmount.toString(),
                            currentBalance = insufficientFundsDetails.availableAmount.toString(),
                        )
                    )
                } else {
                    customerDisplayManager.updateState(CustomerDisplayState.Welcome)
                }

                clearScannedTag()
                val localizedMessage = localizeSaleErrorMessage(response.msg())
                _error.update { localizedMessage }
                _status.update { localizedMessage }
            }

            is Response.Error -> {
                _status.update { localizeSaleErrorMessage(response.msg()) }
            }
        }
    }

    suspend fun checkSaleCash() {
        if (_saleStatus.value.buttonSelection.isEmpty()) {
            _status.update { context.getString(R.string.sale_status_nothing_ordered) }
            return
        }

        _status.update { context.getString(R.string.order_checking) }

        val response = saleRepository.checkSale(
            _saleStatus.value.getNewSale(method = PaymentMethod.cash)
        )

        when (response) {
            is Response.OK -> {
                _saleStatus.update { sale ->
                    val newSale = sale.copy()
                    newSale.updateWithPendingSale(response.data)
                    newSale
                }
                _status.update { context.getString(R.string.sale_status_order_validated) }
                _navState.update { SalePage.Confirm }
            }

            is Response.Error.Service -> {
                // maybe only clear tag for some errors.
                clearScannedTag()
                val localizedMessage = localizeSaleErrorMessage(response.msg())
                _error.update { localizedMessage }
                _status.update { localizedMessage }
            }

            is Response.Error -> {
                _status.update { localizeSaleErrorMessage(response.msg()) }
            }
        }
    }

    suspend fun checkSaleCard() {
        if (_saleStatus.value.buttonSelection.isEmpty()) {
            _status.update { context.getString(R.string.sale_status_nothing_ordered) }
            return
        }

        _status.update { context.getString(R.string.order_checking) }

        val response = saleRepository.checkSale(
            _saleStatus.value.getNewSale(method = PaymentMethod.sumup)
        )

        when (response) {
            is Response.OK -> {
                _saleStatus.update { sale ->
                    val newSale = sale.copy()
                    newSale.updateWithPendingSale(response.data)
                    newSale
                }
                _status.update { context.getString(R.string.sale_status_order_validated) }
                _navState.update { SalePage.Confirm }
            }

            is Response.Error.Service -> {
                // maybe only clear tag for some errors.
                clearScannedTag()
                val localizedMessage = localizeSaleErrorMessage(response.msg())
                _error.update { localizedMessage }
                _status.update { localizedMessage }
            }

            is Response.Error -> {
                _status.update { localizeSaleErrorMessage(response.msg()) }
            }
        }
    }

    private fun localizeSaleErrorMessage(message: String): String {
        val insufficientFundsDetails = parseInsufficientFundsDetails(message) ?: return message

        return context.getString(
            R.string.sale_status_insufficient_funds,
            formatSaleAmountForLocale(insufficientFundsDetails.neededAmount),
            formatSaleAmountForLocale(insufficientFundsDetails.availableAmount),
        )
    }

    private fun formatSaleAmountForLocale(value: Double): String {
        return synchronized(saleAmountNumberFormat) {
            saleAmountNumberFormat.format(value)
        }
    }

    // Function to show a completed sale on the customer display
    private fun updateCustomerDisplay(completedSale: CompletedSale?) {
        completedSale?.let {
            customerDisplayManager.updateState(CustomerDisplayState.SaleCompleted(it))
        } ?: customerDisplayManager.updateState(CustomerDisplayState.Welcome)
    }

    suspend fun bookSale(context: Activity) {
        val tag = _saleStatus.value.tag
        val sale = _saleStatus.value.checkedSale
        if (sale == null) {
            _status.update { context.getString(R.string.sale_status_unchecked_sale) }
            return
        }

        if (sale.paymentMethod == PaymentMethod.sumup) {
            ecPaymentRepository.wakeup()

            val payment = ECPayment(
                id = sale.uuid.toString(),
                amount = BigDecimal(sale.totalPrice),
                // we don't have a NFC tag for direct card sales.
                tag = NfcTag(BigInteger(0), null),
            )

            // TODO: register pending sale for guaranteed sumup processing

            _status.update { context.getString(R.string.sale_status_starting_ec) }

            // workaround so the sumup activity is not in foreground too quickly.
            // when it's active, nfc intents are no longer captured by us, apparently,
            // and then the system nfc handler spawns the default handler (e.g. stustapay) again.
            // https://stackoverflow.com/questions/60868912
            delay(800)

            when (val paymentResult = ecPaymentRepository.pay(context, payment)) {
                is ECPaymentResult.Failure -> {
                    _status.update { context.getString(R.string.topup_status_ec_result, paymentResult.msg) }
                    return
                }

                is ECPaymentResult.Success -> {
                    _status.update { context.getString(R.string.topup_status_ec_result, paymentResult.result.msg) }
                }
            }
        }

        _saleCompleted.update { null }

        val response = saleRepository.bookSale(
            newSale = _saleStatus.value.getNewSale(tag, sale.paymentMethod)
        )

        when (response) {
            is Response.OK -> {
                // delete the sale draft
                clearSale()
                _status.update { context.getString(R.string.ticket_order_booked) }
                // now we have a completed sale
                _saleCompleted.update { response.data }
                _navState.update { SalePage.Success }
                
                // Update the customer display with the completed sale information
                updateCustomerDisplay(response.data)
            }

            is Response.Error.Service -> {
                clearScannedTag()
                _navState.update { SalePage.Error }
                _status.update { response.msg() }
                
                // Reset customer display to welcome state on error
                customerDisplayManager.updateState(CustomerDisplayState.Welcome)
            }

            is Response.Error -> {
                _status.update { response.msg() }
                
                // Reset customer display to welcome state on error
                customerDisplayManager.updateState(CustomerDisplayState.Welcome)
            }
        }
    }

    // Helper function to update customer display with current product list
    private fun updateCustomerDisplayWithCurrentProducts() {
        if (_saleStatus.value.buttonSelection.isEmpty()) {
            // If no products, revert to welcome screen
            customerDisplayManager.updateState(CustomerDisplayState.Welcome)
            return
        }
        
        // Get the products information for display
        val productsList = _saleStatus.value.buttonSelection.map { (buttonId, amount) ->
            val buttonConfig = saleConfig.value.getButtonConfig(buttonId)
            val quantity = when (amount) {
                is SaleItemAmount.FixedPrice -> amount.amount.toString()
                is SaleItemAmount.FreePrice -> "1x"
            }
            Pair(buttonConfig?.caption ?: "Unknown", quantity)
        }
        
        // Calculate rough total price based on current selections
        val roughTotalPrice = _saleStatus.value.getRoughTotalPrice(saleConfig.value).toString()
        
        // Show products and total price on customer display
        customerDisplayManager.updateState(
            CustomerDisplayState.ValidatingSale(
                totalPrice = roughTotalPrice,
                currentBalance = "", // Remove the current balance
                products = productsList
            )
        )
    }

    private fun mapSaleConfig(
        terminalConfigFlow: StateFlow<TerminalConfigState>,
    ): StateFlow<SaleConfig> {

        return terminalConfigFlow.mapState(SaleConfig.NotReady, viewModelScope) { terminalConfig ->
            when (terminalConfig) {
                is TerminalConfigState.Success -> {
                    val till = terminalConfig.config.till
                    if (till != null) {
                        _status.update { context.getString(R.string.sale_status_ready_for_order) }
                        SaleConfig.Ready(
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
                            till = till,
                        )
                    } else {
                        _status.update { context.getString(R.string.sale_status_no_till_assigned) }
                        SaleConfig.NotReady
                    }
                }

                is TerminalConfigState.Error -> {
                    _status.update { terminalConfig.message }
                    SaleConfig.NotReady
                }

                is TerminalConfigState.NoConfig -> {
                    _status.update { context.getString(R.string.operator_console_loading) }
                    SaleConfig.NotReady
                }
            }
        }
    }
}
