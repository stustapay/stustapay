package de.stustapay.stustapay.ui.payinout.topup

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.model.CompletedTopUp
import de.stustapay.stustapay.model.NewTopUp
import de.stustapay.stustapay.model.PaymentMethod
import de.stustapay.stustapay.model.UserTag
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.repository.ECPaymentRepository
import de.stustapay.stustapay.repository.ECPaymentResult
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TopUpRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
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
)


@HiltViewModel
class TopUpViewModel @Inject constructor(
    private val topUpRepository: TopUpRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val userRepository: UserRepository,
    private val ecPaymentRepository: ECPaymentRepository,
) : ViewModel() {
    private val _navState = MutableStateFlow(TopUpPage.Selection)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _topUpState = MutableStateFlow(TopUpState())
    val topUpState = _topUpState.asStateFlow()

    // when we finished a sale
    private val _topUpCompleted = MutableStateFlow<CompletedTopUp?>(null)
    val topUpCompleted = _topUpCompleted.asStateFlow()

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

    fun setAmount(amount: UInt) {
        _topUpState.update {
            it.copy(currentAmount = amount)
        }
    }

    fun clearDraft() {
        _topUpCompleted.update { null }
        _topUpState.update { TopUpState() }
        _status.update { "ready" }
    }

    fun checkAmountLocal(amount: Double): Boolean {
        val minimum = 1.0
        if (amount < minimum) {
            _status.update { "Mindestbetrag %.2f €".format(minimum) }
            return false
        }
        return true
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
        return when (val response = topUpRepository.checkTopUp(newTopUp)) {
            is Response.OK -> {
                _status.update { "TopUp possible" }
                true
            }

            is Response.Error.Service -> {
                // TODO: if we remember the scanned tag, clear it here.
                _status.update { response.msg() }
                false
            }

            is Response.Error -> {
                _status.update { response.msg() }
                false
            }
        }
    }

    /**
     * creates a ec payment with new id for the current selected sum.
     */
    private fun getECPayment(newTopUp: NewTopUp): ECPayment {
        return ECPayment(
            id = newTopUp.uuid,
            amount = BigDecimal(newTopUp.amount),
            tag = UserTag(newTopUp.customer_tag_uid),
        )
    }

    /** called from the card payment button */
    suspend fun topUpWithCard(context: Activity, tag: UserTag) {
        _status.update { "Card TopUp in progress..." }

        val newTopUp = NewTopUp(
            amount = _topUpState.value.currentAmount.toDouble() / 100,
            customer_tag_uid = tag.uid,
            payment_method = PaymentMethod.SumUp,
            // we generate the topup transaction identifier here
            uuid = UUID.randomUUID().toString(),
        )

        if (!checkTopUp(newTopUp)) {
            // it already updates the status message
            return
        }

        val payment = getECPayment(newTopUp)

        _status.update { "Remove the chip. Starting SumUp..." }

        // workaround so the sumup activity is not in foreground too quickly.
        // when it's active, nfc intents are no longer captured by us, apparently,
        // and then the system nfc handler spawns the default handler (e.g. stustapay) again.
        // https://stackoverflow.com/questions/60868912
        delay(1000)

        when (val paymentResult = ecPaymentRepository.pay(context, payment)) {
            is ECPaymentResult.Failure -> {
                _status.update { paymentResult.msg }
                return
            }

            is ECPaymentResult.Success -> {
                _status.update { paymentResult.result.msg }
            }
        }

        // TODO: maybe retry - but this should be done in http layer already...
        when (val response = topUpRepository.bookTopUp(newTopUp)) {
            is Response.OK -> {
                clearDraft()
                _topUpCompleted.update { response.data }
                _status.update { "Card TopUp successful" }
                _navState.update { TopUpPage.Done }
            }

            is Response.Error -> {
                _status.update { "Card TopUp failed! ${response.msg()}" }
                _navState.update { TopUpPage.Failure }
            }
        }
    }


    suspend fun topUpWithCash(tag: UserTag) {
        _status.update { "Cash TopUp in progress..." }

        val newTopUp = NewTopUp(
            amount = _topUpState.value.currentAmount.toDouble() / 100,
            customer_tag_uid = tag.uid,
            payment_method = PaymentMethod.Cash,
            // we generate the topup transaction identifier here
            uuid = UUID.randomUUID().toString(),
        )

        if (!checkTopUp(newTopUp)) {
            // it already updates the status message
            return
        }

        when (val response = topUpRepository.bookTopUp(newTopUp)) {
            is Response.OK -> {
                clearDraft()
                _topUpCompleted.update { response.data }
                _navState.update { TopUpPage.Done }
                _status.update { "Cash TopUp successful!" }
            }

            is Response.Error -> {
                _status.update { "Cash TopUp failed! ${response.msg()}" }
                _navState.update { TopUpPage.Failure }
            }
        }
    }

    fun navigateTo(target: TopUpPage) {
        _navState.update { target }
    }
}