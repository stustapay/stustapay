package de.stustapay.stustapay.ui.payinout.postpayment


import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CompletedPayOut
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.netsource.TopUpRemoteDataSource
import de.stustapay.stustapay.repository.ECPaymentRepository
import de.stustapay.stustapay.repository.ECPaymentResult
import de.stustapay.stustapay.repository.PayOutRepository
import de.stustapay.stustapay.repository.InfallibleRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.stustapay.ui.payinout.payout.PayOutState
import de.stustapay.stustapay.ui.payinout.topup.TopUpState
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

data class PostPaymentState(
    /** desired deposit amount in cents */
    var currentAmount: Double = 0.00,
)


enum class PostPaymentPage(val route: String) {
    Selection("amount"),
    Done("done"),
    Failure("aborted"),
}

@HiltViewModel
class PostPaymentViewModel @Inject constructor(
    private val topUpApi: TopUpRemoteDataSource,
    private val terminalConfigRepository: TerminalConfigRepository,
    userRepository: UserRepository,
    private val ecPaymentRepository: ECPaymentRepository,
    private val infallibleRepository: InfallibleRepository,
    private val payOutRepository: PayOutRepository,
) : ViewModel() {
    private val _navState = MutableStateFlow(PostPaymentPage.Selection)
    val navState = _navState.asStateFlow()

    private val _payOutState = MutableStateFlow(PayOutState())
    val payOutState = _payOutState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage = _errorMessage.asStateFlow()

    private val _completedPayOut = MutableStateFlow<CompletedPayOut?>(null)
    val completedPayOut = _completedPayOut.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage = _successMessage.asStateFlow()

    private val _topUpState = MutableStateFlow(TopUpState())
    val topUpState = _topUpState.asStateFlow()

    private val _postPaymentState = MutableStateFlow(PostPaymentState())
    val postPaymentState = _postPaymentState.asStateFlow()

    // when we finished a sale
    private val _topUpCompleted = MutableStateFlow<CompletedTopUp?>(null)
    val topUpCompleted = _topUpCompleted.asStateFlow()

    // dirty hack to make the error page an ok page for already-booked errors
    // todo: remove :)
    private val _actuallyOk = MutableStateFlow(false)
    val actuallyOk = _actuallyOk.asStateFlow()

    private val _showPayOutConfirm = MutableStateFlow(false)
    val showPayOutConfirm = _showPayOutConfirm.asStateFlow()


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

    suspend fun tagScanned(tag: NfcTag) {
        _payOutState.update {
            PayOutState(tag = tag)
        }
        checkPayOut()
    }

    fun clearPayOutState() {
        _payOutState.value = PayOutState()
    }

    /**
     * validates the cashout amount so we can continue to payment
     */
    private suspend fun checkPayOut(): Boolean {
        val newPayOut = _payOutState.value.getNewPayOut()
        if (newPayOut == null) {
            _status.update { "No tag known" }
            return false
        }

        // local check: amount has to be negative for payouts
        val amount = newPayOut.amount
        if (amount != null && amount >= 0.0) {
            _status.update { "Amount is zero" }
            return false
        }

        // server-side check
        _status.update { "Checking PayOut" }
        return when (val response = payOutRepository.checkPayOut(newPayOut)) {
            is Response.OK -> {
                _payOutState.update {
                    val state = it.copy()
                    state.updateWithPendingPayOut(response.data)
                    state
                }
                _status.update { "PayOut valid" }
                true
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
                false
            }

            is Response.Error -> {
                _status.update { response.msg() }
                false
            }
        }
    }

    fun setAmount(amount: Double) {
        _postPaymentState.update {
            it.copy(currentAmount = amount)
        }
    }

    // Function to clear the payout tag after payment
    fun clearTag() {
        _payOutState.update { it.copy(tag = null) }
    }

    fun clearCheckPayout() {
        _payOutState.update { it.copy(tag = null) }
    }


    fun clearDraft() {
        _topUpCompleted.update { null }
        _postPaymentState.update { PostPaymentState() }
        _status.update { "ready" }
        clearPayOutState()
    }

    fun checkAmountLocal(amount: Double): Boolean {
        val minimum = 1.0
        if (amount != 0.0) {
            _status.update { "Mindestbetrag %.2f €".format(minimum) }
            return false
        }
        return true
    }




    /**
     * validates the amount so we can continue to checkout
     */
    private suspend fun checkTopUp(newTopUp: NewTopUp): Boolean {

        // server-side check
        return when (val response = topUpApi.checkTopUp(newTopUp)) {
            is Response.OK -> {
                _status.update { "TopUp possible" }
                true
            }

            is Response.Error.Service -> {
                // TODO: if we remember the scanned tag, clear it here.
                _status.update { response.msg() }
                _errorMessage.update { response.msg() }
                false
            }

            is Response.Error -> {
                _status.update { response.msg() }
                false
            }
        }
    }

    fun clearAmount() {
        _payOutState.update {
            val newState = it.copy()
            newState.setAmount(0u)
            newState
        }
    }

    /** the big payout button was pressed */
    suspend fun requestPayOut() {
        var showConfirm = true
        if (_payOutState.value.wasChanged()) {
            showConfirm = checkPayOut()
        }

        if (showConfirm) {
            _showPayOutConfirm.update { true }
        }
    }

    /** when the confirmation dialog is confirmed */
    suspend fun confirmPayOut() {
        _showPayOutConfirm.update { false }
        _status.update { "Processing payout..." }

        bookPayOut()
    }

    /** when the confirmation dialog is dismissed */
    fun dismissPayOutConfirm() {
        _showPayOutConfirm.update { false }
    }

    private suspend fun bookPayOut() {
        val newPayOut = _payOutState.value.getCheckedNewPayout()

        if (newPayOut == null) {
            _status.update { "Payout was not checked before" }
            return
        }

        _status.update { "Pay-Out in progress..." }

        when (val response = payOutRepository.bookPayOut(newPayOut)) {
            is Response.OK -> {
                clearDraft()
                _completedPayOut.update { response.data }
                _status.update { "Pay-Out booked successfully" }
            }

            is Response.Error -> {
                _status.update { "Failed Pay-Out booking! ${response.msg()}" }
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
        )
    }

    /** called from the card payment button */
    suspend fun topUpWithCard(context: Activity, tag: NfcTag) {
        _status.update { "Card TopUp in progress..." }
        // wake the soon-needed reader :)
        // TODO: move this even before the chip scan
        // CashECPay could get a prepareEC callback function for that.
        ecPaymentRepository.wakeup()

        val newTopUp = NewTopUp(
            amount = _postPaymentState.value.currentAmount,
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

        _status.update { "Remove the chip. Starting EC transaction..." }

        // workaround so the sumup activity is not in foreground too quickly.
        // when it's active, nfc intents are no longer captured by us, apparently,
        // and then the system nfc handler spawns the default handler (e.g. stustapay) again.
        // https://stackoverflow.com/questions/60868912
        delay(800)

        // perform ec transaction
        when (val paymentResult = ecPaymentRepository.pay(context, payment)) {
            is ECPaymentResult.Failure -> {
                _status.update { "EC: ${paymentResult.msg}" }
                clearDraft()
                return
            }

            is ECPaymentResult.Success -> {
                _status.update { "EC: ${paymentResult.result.msg}" }
            }
        }

        // when successful, book the transaction
        bookTopUp("Card", newTopUp)
    }

    suspend fun topUpWithCash(tag: NfcTag) {
        _status.update { "Cash TopUp in progress..." }

        val newTopUp = NewTopUp(
            amount = _postPaymentState.value.currentAmount,
            customerTagUid = tag.uid,
            paymentMethod = PaymentMethod.cash,
            // we generate the topup transaction identifier here
            uuid = UUID.randomUUID(),
        )

        if (!checkTopUp(newTopUp)) {
            // it already updates the status message
            return
        }

        bookTopUp("Cash", newTopUp)
    }

    private suspend fun bookTopUp(topUpType: String, newTopUp: NewTopUp) {
        _status.update { "Booking $topUpType TopUp..." }
        when (val response = infallibleRepository.bookTopUp(newTopUp)) {
            is Response.OK -> {
                clearDraft()
                clearPayOutState()
                _topUpCompleted.update { response.data }
                _status.update { "$topUpType TopUp successful!" }
            }

            is Response.Error.Service.AlreadyProcessed -> {
                // TODO: get a CompletedTopUp here from response, and navigate to Done-Page
                clearDraft()
                _status.update { "$topUpType TopUp successful!" }
                _actuallyOk.update { true }
                _navState.update { PostPaymentPage.Failure }
            }

            is Response.Error -> {
                _status.update { "$topUpType TopUp failed! ${response.msg()}" }
                _actuallyOk.update { false }
                _navState.update { PostPaymentPage.Failure }
            }
        }
    }


    fun navigateTo(target: PostPaymentPage) {
        _navState.update { target }
    }

    /** when a topup was successful and the confirmation was dismissed */
    fun dismissSuccess() {
        // todo: some feedback during this refresh?
        viewModelScope.launch {
            terminalConfigRepository.tokenRefresh()
        }
        navigateTo(PostPaymentPage.Selection)
    }

    fun dismissFailure() {
        navigateTo(PostPaymentPage.Selection)
    }

    fun dismissError() {
        _errorMessage.update { null }
    }
}