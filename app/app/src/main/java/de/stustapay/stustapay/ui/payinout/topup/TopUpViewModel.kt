package de.stustapay.stustapay.ui.payinout.topup

import android.app.Activity
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.netsource.TopUpRemoteDataSource
import de.stustapay.stustapay.repository.ECPaymentRepository
import de.stustapay.stustapay.repository.ECPaymentResult
import de.stustapay.stustapay.repository.InfallibleRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.stustapay.display.CustomerDisplayManager
import de.stustapay.stustapay.display.CustomerDisplayState
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.util.UUID
import javax.inject.Inject


enum class TopUpPage(val route: String) {
    Selection("amount"),
    Done("done"),
    Failure("aborted"),
}


data class TopUpState(
    /** desired deposit amount in cents */
    var currentAmount: UInt = 0u,
    var amountSelected: Boolean = false,
)


@HiltViewModel
class TopUpViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val topUpApi: TopUpRemoteDataSource,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val userRepository: UserRepository,
    private val ecPaymentRepository: ECPaymentRepository,
    private val infallibleRepository: InfallibleRepository,
    private val customerDisplayManager: CustomerDisplayManager
) : ViewModel() {
    private val _navState = MutableStateFlow(TopUpPage.Selection)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage = _errorMessage.asStateFlow()

    private val _topUpState = MutableStateFlow(TopUpState())
    val topUpState = _topUpState.asStateFlow()
    private val _uiLocked = MutableStateFlow(false)
    val uiLocked = _uiLocked.asStateFlow()
    private val _waitingForSumUpLaunch = MutableStateFlow(false)
    val waitingForSumUpLaunch = _waitingForSumUpLaunch.asStateFlow()

    // when we finished a sale
    private val _topUpCompleted = MutableStateFlow<CompletedTopUp?>(null)
    val topUpCompleted = _topUpCompleted.asStateFlow()

    val requestActive = infallibleRepository.active

    // configuration infos from backend
    val terminalLoginState = combine(
        userRepository.userState,
        terminalConfigRepository.terminalConfigState
    ) { user, terminal ->
        TerminalLoginState(user, terminal)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = TerminalLoginState(),
    )

    // Flag to track if token refresh is active
    private val _tokenRefreshActive = MutableStateFlow(false)
    
    init {
        // Start token refresh job when ViewModel is created
        startTokenRefresh()
    }
    
    private fun startTokenRefresh() {
        viewModelScope.launch {
            _tokenRefreshActive.update { true }
            try {
                while (_tokenRefreshActive.value) {
                    // Check and refresh token if needed
                    terminalConfigRepository.tokenRefresh()
                    // Wait for 2 minutes before checking again
                    delay(2 * 60 * 1000)
                }
            } catch (e: Exception) {
                _status.update {
                    context.getString(
                        R.string.topup_status_token_refresh_error,
                        e.message ?: context.getString(R.string.error)
                    )
                }
            }
        }
    }
    
    // Make sure to stop token refresh when ViewModel is cleared
    override fun onCleared() {
        super.onCleared()
        _tokenRefreshActive.update { false }
    }

    fun setAmount(amount: UInt) {
        _topUpState.update {
            it.copy(currentAmount = amount, amountSelected = amount > 0u)
        }
    }

    fun clearDraft() {
        _topUpCompleted.update { null }
        _topUpState.update { TopUpState() }
        _status.update { context.getString(R.string.operator_status_ready) }
        _uiLocked.update { false }
        _waitingForSumUpLaunch.update { false }
        
        // Reset customer display to welcome state
        customerDisplayManager.updateState(CustomerDisplayState.Welcome)
    }

    fun checkAmountLocal(amount: Double): Boolean {
        val minimum = 1.0
        if (amount < minimum) {
            _status.update { context.getString(R.string.topup_status_minimum_amount, minimum) }
            return false
        }
        return true
    }

    fun isCardReaderReady(): Boolean {
        return ecPaymentRepository.isReady()
    }

    suspend fun startCardReaderSetup(context: Activity) {
        _status.update { this.context.getString(R.string.topup_status_ec_reader_setup) }
        val reactivationError = ecPaymentRepository.reactivateReader()
        if (reactivationError == null) {
            return
        }

        val setupError = ecPaymentRepository.startCardReaderSetup(context)
        if (setupError != null) {
            _status.update { setupError }
            _errorMessage.update { setupError }
        }
    }

    /**
     * validates the amount so we can continue to checkout
     */
    private suspend fun checkTopUp(newTopUp: NewTopUp): Boolean {
        // device-local checks
        if (!checkAmountLocal(newTopUp.amount)) {
            return false
        }

        // server-side check
        return when (val response = topUpApi.checkTopUp(newTopUp)) {
            is Response.OK -> {
                _status.update { context.getString(R.string.topup_status_topup_possible) }
                true
            }

            is Response.Error.Service -> {
                // TODO: if we remember the scanned tag, clear it here.
                _status.update { response.msg() }
                _errorMessage.update { response.msg() }
                false
            }

            is Response.Error -> {
                val msg = response.msg()
                _status.update { msg }
                _errorMessage.update { msg }
                false
            }
        }
    }

    /**
     * creates a ec payment with new id for the current selected sum.
     */
    private fun getECPayment(newTopUp: NewTopUp): ECPayment {
        return ECPayment(
            id = newTopUp.uuid.toString(),
            amount = BigDecimal(newTopUp.amount),
            tag = NfcTag(newTopUp.customerTagUid, null),
            allowTipOnCardReader = false,
        )
    }

    private fun topUpTypeCard(): String = context.getString(R.string.topup_payment_type_card)

    private fun topUpTypeCash(): String = context.getString(R.string.topup_payment_type_cash)

    /** called from the card payment button */
    suspend fun topUpWithCard(context: Activity, tag: NfcTag) {
        if (_uiLocked.value) {
            return
        }
        _uiLocked.update { true }
        try {
            _status.update { context.getString(R.string.topup_status_card_in_progress) }
            // wake the soon-needed reader :)
            // TODO: move this even before the chip scan
            // CashECPay could get a prepareEC callback function for that.
            ecPaymentRepository.wakeup()

            // Check and refresh token if needed before payment
            terminalConfigRepository.tokenRefresh()

            val newTopUp = NewTopUp(
                amount = _topUpState.value.currentAmount.toDouble() / 100,
                customerTagUid = tag.uid,
                paymentMethod = PaymentMethod.sumup,
                // we generate the topup transaction identifier here
                uuid = UUID.randomUUID(),
            )

            if (!checkTopUp(newTopUp)) {
                // it already updates the status message
                return
            }

            val payment = getECPayment(newTopUp)

            // pre-register the payment so the backend starts polling sumup
            // if the transaction has completed, but the callback to the POS terminal got missing
            // due to wlan glitches etc.

            if (!registerTopUp(topUpTypeCard(), newTopUp)) {
                // already updates status message
                return
            }

            _status.update { context.getString(R.string.topup_status_remove_chip_start_ec) }
            _waitingForSumUpLaunch.update { true }

            // workaround so the sumup activity is not in foreground too quickly.
            // when it's active, nfc intents are no longer captured by us, apparently,
            // and then the system nfc handler spawns the default handler (e.g. stustapay) again.
            // https://stackoverflow.com/questions/60868912
            delay(800)
            _waitingForSumUpLaunch.update { false }

            // perform ec transaction
            when (val paymentResult = ecPaymentRepository.pay(context, payment)) {
                is ECPaymentResult.Failure -> {
                    _status.update { context.getString(R.string.topup_status_ec_result, paymentResult.msg) }
                    if (!paymentResult.mayHaveCreatedCharge) {
                        topUpApi.cancelPendingTopUp(newTopUp.uuid)
                    }
                    return
                }

                is ECPaymentResult.Success -> {
                    _status.update { context.getString(R.string.topup_status_ec_result, paymentResult.result.msg) }
                }
            }

            // when successful, book the transaction
            // if this doesn't reach the backend, the backend will book the topUp on its own
            // when sumup confirms the payment.
            bookTopUp(topUpTypeCard(), newTopUp)
        } finally {
            _uiLocked.update { false }
            _waitingForSumUpLaunch.update { false }
        }
    }

    suspend fun topUpWithCash(tag: NfcTag) {
        if (_uiLocked.value) {
            return
        }
        _uiLocked.update { true }
        try {
            _status.update { context.getString(R.string.topup_status_cash_in_progress) }

            val newTopUp = NewTopUp(
                amount = _topUpState.value.currentAmount.toDouble() / 100,
                customerTagUid = tag.uid,
                paymentMethod = PaymentMethod.cash,
                // we generate the topup transaction identifier here
                uuid = UUID.randomUUID(),
            )

            if (!checkTopUp(newTopUp)) {
                // it already updates the status message
                return
            }

            bookTopUp(topUpTypeCash(), newTopUp)
        } finally {
            _uiLocked.update { false }
        }
    }

    private suspend fun registerTopUp(topUpType: String, newTopUp: NewTopUp): Boolean {
        _status.update { context.getString(R.string.topup_status_announcing, topUpType) }

        when (val response = topUpApi.registerTopUp(newTopUp)) {
            is Response.OK -> {
                _status.update { context.getString(R.string.topup_status_announced, topUpType) }
                return true
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
                _navState.update { TopUpPage.Failure }
                return false
            }

            is Response.Error -> {
                val msg = response.msg()
                _status.update { msg }
                _errorMessage.update { msg }
                return false
            }
        }
    }

    private suspend fun bookTopUp(topUpType: String, newTopUp: NewTopUp) {
        _status.update { context.getString(R.string.topup_status_booking, topUpType) }
        when (val response = infallibleRepository.bookTopUp(newTopUp)) {
            is Response.OK -> {
                clearDraft()
                _topUpCompleted.update { response.data }
                _status.update { context.getString(R.string.topup_status_successful, topUpType) }
                _navState.update { TopUpPage.Done }
                
                // Update the customer display with the top-up information
                updateCustomerDisplay(response.data)
            }

            is Response.Error -> {
                val msg = context.getString(R.string.topup_status_failed, topUpType, response.msg())
                _status.update { msg }
                _errorMessage.update { msg }
                _navState.update { TopUpPage.Failure }
                
                // Reset customer display to welcome state on error
                customerDisplayManager.updateState(CustomerDisplayState.Welcome)
            }
        }
    }

    // Function to update the customer display with top-up information
    private fun updateCustomerDisplay(topUp: CompletedTopUp?) {
        topUp?.let {
            customerDisplayManager.updateState(
                CustomerDisplayState.TopUpCompleted(
                    newBalance = it.newBalance,
                    topUpAmount = it.amount
                )
            )
        } ?: customerDisplayManager.updateState(CustomerDisplayState.Welcome)
    }

    fun navigateTo(target: TopUpPage) {
        _navState.update { target }
        
        // When navigating to the selection screen, ensure we have a fresh token
        // and reset the customer display
        if (target == TopUpPage.Selection) {
            viewModelScope.launch {
                // Refresh token if needed
                terminalConfigRepository.tokenRefresh()
            }
            
            // Reset the customer display
            customerDisplayManager.updateState(CustomerDisplayState.Welcome)
        }
    }

    /** when a topup was successful and the confirmation was dismissed */
    fun dismissSuccess() {
        _status.update { context.getString(R.string.operator_status_ready) }
        // todo: some feedback during this refresh?
        viewModelScope.launch {
            terminalConfigRepository.tokenRefresh()
        }
        navigateTo(TopUpPage.Selection)
    }

    fun dismissFailure() {
        _uiLocked.update { false }
        _waitingForSumUpLaunch.update { false }
        navigateTo(TopUpPage.Selection)
    }

    fun dismissError() {
        _errorMessage.update { null }
    }

}
