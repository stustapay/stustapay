package de.stustanet.stustapay.ui.reward

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.R
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CustomerRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.ui.common.TerminalLoginState
import de.stustanet.stustapay.util.ResourcesProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject


@HiltViewModel
class RewardViewModel @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
    private val userRepository: UserRepository,
    private val customerRepository: CustomerRepository,
    private val resourcesProvider: ResourcesProvider,
) : ViewModel() {

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

    private val _vouchers = MutableStateFlow(0u)
    val vouchers = _vouchers.asStateFlow()

    private val _newTicket = MutableStateFlow(false)
    val newTicket = _newTicket.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
        userRepository.fetchLogin()
    }

    private suspend fun grantVouchers(tag: UserTag, vouchers: UInt) {
        when (val resp = customerRepository.grantVouchers(tag, vouchers)) {
            is Response.OK -> {
                _status.update {
                    resourcesProvider.getString(R.string.vouchers_granted).format(vouchers)
                }
                clearSelection()
            }

            is Response.Error -> {
                _status.update { resp.msg() }
            }
        }
    }

    private suspend fun grantFreeTicket(tag: UserTag, vouchers: UInt) {
        when (val resp = customerRepository.grantFreeTicket(tag, vouchers)) {
            is Response.OK -> {
                val voucherAmount = if (vouchers > 0u) {
                    resourcesProvider.getString(R.string.with_n_vouchers).format(vouchers)
                } else {
                    ""
                }
                _status.update { resourcesProvider.getString(R.string.free_ticket_activated) + voucherAmount }
                clearSelection()
            }

            is Response.Error -> {
                _status.update { resp.msg() }
            }
        }
    }

    suspend fun tagScanned(tag: UserTag) {
        if (_newTicket.value) {
            grantFreeTicket(tag, _vouchers.value)
        } else {
            grantVouchers(tag, _vouchers.value)
        }
    }

    private fun clearSelection() {
        clearNewTicket()
        vouchersCleared()
    }

    fun vouchersChanged(amount: UInt) {
        // limited in amount selection already
        _vouchers.update { amount }
    }

    fun vouchersCleared() {
        _vouchers.update { 0u }
    }

    fun selectNewTicket() {
        _newTicket.update { true }
    }

    fun clearNewTicket() {
        _newTicket.update { false }
    }

    fun getVoucherAmount(): UInt {
        return _vouchers.value
    }
}
