package de.stustanet.stustapay.ui.payinout.payout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.CompletedPayOut
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.PayOutRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.ui.common.TerminalLoginState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject


@HiltViewModel
class PayOutViewModel @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
    private val userRepository: UserRepository,
    private val payOutRepository: PayOutRepository,
) : ViewModel() {

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _payOutState = MutableStateFlow(PayOutState())
    val payOutState = _payOutState.asStateFlow()

    // when we finished a payout
    private val _completedPayOut = MutableStateFlow<CompletedPayOut?>(null)
    val completedPayOut = _completedPayOut.asStateFlow()

    private val _showPayOutConfirm = MutableStateFlow(false)
    val showPayOutConfirm = _showPayOutConfirm.asStateFlow()

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

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
        userRepository.fetchLogin()
    }

    suspend fun tagScanned(tag: UserTag) {
        _payOutState.update {
            PayOutState(tag = tag)
        }
        checkPayOut()
    }

    fun setAmount(amount: UInt) {
        _payOutState.update {
            val newState = it.copy()
            newState.setAmount(amount)
            newState
        }
    }

    fun clearAmount() {
        _payOutState.update {
            val newState = it.copy()
            newState.setAmount(0u)
            newState
        }
    }

    fun clearDraft() {
        _completedPayOut.update { null }
        _payOutState.update { PayOutState() }
        _status.update { "ready" }
    }

    /** the big payout button was pressed */
    suspend fun requestPayOut() {
        var showConfirm = true
        if (!_payOutState.value.wasChanged()) {
            showConfirm = checkPayOut()
        }

        if (showConfirm) {
            _showPayOutConfirm.update { true }
        }
    }

    /** when the confirmation dialog is confirmed */
    suspend fun confirmPayOut() {
        _showPayOutConfirm.update { false }
        _status.update { "processing payout..." }

        bookPayOut()
    }

    /** when the confirmation dialog is dismissed */
    fun dismissPayOutConfirm() {
        _showPayOutConfirm.update { false }
    }

    /** when the success dialog is dismissed */
    fun dismissPayOutSuccess() {
        _completedPayOut.update { null }
        _status.update { "ready" }
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

        // local check
        if (newPayOut.amount != null && newPayOut.amount <= 0.0) {
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

    private suspend fun bookPayOut() {
        val newPayOut = _payOutState.value.getCheckedNewPayout()

        if (newPayOut == null) {
            _status.update { "payout was not checked before" }
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
}