package de.stustanet.stustapay.ui.topup

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.ec.SumUp
import de.stustanet.stustapay.ec.SumUpState
import de.stustanet.stustapay.model.CompletedTopUp
import de.stustanet.stustapay.model.NewTopUp
import de.stustanet.stustapay.model.PaymentMethod
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.TopUpRepository
import de.stustanet.stustapay.util.mapState
import de.stustanet.stustapay.util.waitFor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import java.util.UUID
import javax.inject.Inject

enum class TopUpPage(val route: String) {
    Amount("amount"),
    Cash("cash"),
    Done("done"),
    Failure("aborted"),
}


data class TopUpState(
    /** desired deposit amount in cents */
    var currentAmount: UInt = 0u,

    /** is the topup currently in progress */
    var inProgress: Boolean = false,
)


@HiltViewModel
class DepositViewModel @Inject constructor(
    private val topUpRepository: TopUpRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val sumUp: SumUp,
) : ViewModel() {
    private val _navState = MutableStateFlow(TopUpPage.Amount)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _topUpState = MutableStateFlow(TopUpState())
    val topUpState = _topUpState.asStateFlow()

    // when we finished a sale
    private val _topUpCompleted = MutableStateFlow<CompletedTopUp?>(null)
    val topUpCompleted = _topUpCompleted.asStateFlow()

    // configuration infos from backend
    val topUpConfig: StateFlow<TopUpConfig> = mapTopUpConfig(
        terminalConfigRepository.terminalConfigState
    )

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
    }

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
            _status.update { "Mindestbetrag %.2f €".format(minimum.toFloat()) }
            return false
        }
        return true
    }

    /**
     * validates the amount so we can continue to checkout
     */
    private suspend fun checkAmount(newTopUp: NewTopUp): Boolean {
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
            id = newTopUp.uuid ?: UUID.randomUUID().toString(),
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

        if (!checkAmount(newTopUp)) {
            // it already updates the status message
            return
        }

        val payment = getECPayment(newTopUp)

        // perform sumup flow
        sumUp.pay(context, payment)

        val sumUpState = sumUp.paymentStatus.waitFor {
            when (it) {
                is SumUpState.Success,
                is SumUpState.Error,
                is SumUpState.Failed -> {
                    true
                }

                else -> {
                    false
                }
            }
        }

        // proceed to notify the server about the new topup.
        when (sumUpState) {
            is SumUpState.None,
            is SumUpState.Started -> {
                _status.update { "SumUp not finished? ${sumUpState.msg()}" }
                return
            }

            is SumUpState.Failed,
            is SumUpState.Error -> {
                _status.update { "SumUp failed: ${sumUpState.msg()}" }
                return
            }

            is SumUpState.Success -> {
                _status.update { "SumUp success: ${sumUpState.msg()}" }
                // continue
            }
        }

        // TODO log the payment locally on the terminal,
        //      if core communication now fails!

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

        if (!checkAmount(newTopUp)) {
            // it already updates the status message
            return
        }

        when (val response = topUpRepository.bookTopUp(newTopUp)) {
            is Response.OK -> {
                clearDraft()
                _topUpCompleted.update { response.data }
                _status.update { "Cash TopUp successful" }
                _navState.update { TopUpPage.Done }
            }

            is Response.Error -> {
                _status.update { "Cash TopUp failed! ${response.msg()}" }
                _navState.update { TopUpPage.Failure }
            }
        }
    }


    private fun mapTopUpConfig(
        terminalConfigFlow: StateFlow<TerminalConfigState>,
    ): StateFlow<TopUpConfig> {

        return terminalConfigFlow
            .mapState(TopUpConfig(), viewModelScope) { terminalConfig ->
                when (terminalConfig) {
                    is TerminalConfigState.Success -> {
                        _status.update { "ready" }
                        TopUpConfig(
                            ready = true,
                            tillName = terminalConfig.config.name,
                        )
                    }

                    is TerminalConfigState.Error -> {
                        _status.update { terminalConfig.message }
                        TopUpConfig()
                    }

                    is TerminalConfigState.Loading -> {
                        _status.update { "Loading config..." }
                        TopUpConfig()
                    }
                }
            }
    }
}