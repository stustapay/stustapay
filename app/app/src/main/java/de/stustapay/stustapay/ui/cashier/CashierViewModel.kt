package de.stustapay.stustapay.ui.cashier

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CashRegister
import de.stustapay.api.models.CashRegisterStocking
import de.stustapay.api.models.UserInfo
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.combine
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.CashierRepository
import de.stustapay.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class CashierViewModel @Inject constructor(
    private val cashierRepository: CashierRepository, userRepository: UserRepository
) : ViewModel() {
    private val _requestState = MutableStateFlow<CashierRequestState>(CashierRequestState.Done)
    private val _navState = MutableStateFlow<CashierNavState>(CashierNavState.Scan)
    private val _userInfo = MutableStateFlow<UserInfo?>(null)
    private val _amount = MutableStateFlow(0u)
    private val _selectedStocking = MutableStateFlow(0)
    private val _selectedRegister = MutableStateFlow(0)
    private val _stockings = MutableStateFlow<List<CashRegisterStocking>>(listOf())
    private val _registers = MutableStateFlow<List<CashRegister>>(listOf())
    private val _privileged = userRepository.userState.map {
        when (it) {
            is UserState.Error -> false
            is UserState.LoggedIn -> Access.canManageCashiers(it.user)
            UserState.NoLogin -> false
        }
    }

    val uiState = combine(
        _requestState.asStateFlow(),
        _navState.asStateFlow(),
        _userInfo.asStateFlow(),
        _amount.asStateFlow(),
        _selectedStocking.asStateFlow(),
        _selectedRegister.asStateFlow(),
        _stockings.asStateFlow(),
        _registers.asStateFlow(),
        _privileged
    ) { requestState, navState, userInfo, amount, selectedStocking, selectedRegister, stockings, registers, privileged ->
        CashierUiState(requestState, navState, userInfo, amount, selectedStocking, selectedRegister, stockings, registers, privileged)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = CashierUiState(),
    )

    suspend fun fetchTag(tag: NfcTag) {
        _navState.update { CashierNavState.Root }
        _requestState.update { CashierRequestState.Fetching }
        when (val res = cashierRepository.getUserInfo(tag)) {
            is Response.OK -> {
                _userInfo.update { res.data }
                _requestState.update { CashierRequestState.Done }
            }

            is Response.Error -> {
                _requestState.update { CashierRequestState.Failed(res.msg()) }
            }
        }
    }

    fun reset() {
        _navState.update { CashierNavState.Scan }
        _requestState.update { CashierRequestState.Done }
        _userInfo.update { null }
        _amount.update { 0u }
    }

    suspend fun equip() {
        when (val stockings = cashierRepository.getCashierStockings()) {
            is Response.OK -> {
                _stockings.update { stockings.data }
            }

            else -> {
                _stockings.update { listOf() }
            }
        }

        when (val registers = cashierRepository.getRegisters()) {
            is Response.OK -> {
                _registers.update { registers.data }
            }

            else -> {
                _registers.update { listOf() }
            }
        }

        _navState.update { CashierNavState.Equip }
    }

    fun withdraw() {
        _navState.update { CashierNavState.Withdraw }
    }

    fun deposit() {
        _navState.update { CashierNavState.Deposit }
    }

    suspend fun completeEquip() {
        _requestState.update { CashierRequestState.Fetching }
        when (val res = cashierRepository.equipCashier(
            _userInfo.value!!.userTagUid, _registers.value.get(_selectedRegister.value).id, _stockings.value.get(_selectedStocking.value).id
        )) {
            is Response.OK -> {
                _navState.update { CashierNavState.EquipComplete }
                _requestState.update { CashierRequestState.Done }
            }

            is Response.Error -> {
                _requestState.update { CashierRequestState.Failed(res.msg()) }
            }
        }
    }

    suspend fun completeWithdraw() {
        _requestState.update { CashierRequestState.Fetching }
        when (val res = cashierRepository.bookTransport(
            _userInfo.value!!.userTagUid, -_amount.value.toDouble() / 100.0
        )) {
            is Response.OK -> {
                _navState.update { CashierNavState.WithdrawComplete }
                _requestState.update { CashierRequestState.Done }
            }

            is Response.Error -> {
                _requestState.update { CashierRequestState.Failed(res.msg()) }
            }
        }
    }

    suspend fun completeDeposit() {
        _requestState.update { CashierRequestState.Fetching }
        when (val res = cashierRepository.bookTransport(
            _userInfo.value!!.userTagUid, _amount.value.toDouble() / 100.0
        )) {
            is Response.OK -> {
                _navState.update { CashierNavState.DepositComplete }
                _requestState.update { CashierRequestState.Done }
            }

            is Response.Error -> {
                _requestState.update { CashierRequestState.Failed(res.msg()) }
            }
        }
    }

    fun setAmount(amount: UInt) {
        _amount.update { amount }
    }

    fun setStocking(stocking: Int) {
        _selectedStocking.update { stocking }
    }

    fun setRegister(register: Int) {
        _selectedRegister.update { register }
    }
}

data class CashierUiState(
    val request: CashierRequestState = CashierRequestState.Done,
    val nav: CashierNavState = CashierNavState.Scan,
    val userInfo: UserInfo? = null,
    val amount: UInt = 0u,
    val selectedStocking: Int = 0,
    val selectedRegister: Int = 0,
    val stockings: List<CashRegisterStocking> = listOf(),
    val registers: List<CashRegister> = listOf(),
    val privileged: Boolean = false
)

sealed interface CashierNavState {
    object Root : CashierNavState
    object Scan : CashierNavState
    object Equip : CashierNavState
    object Withdraw : CashierNavState
    object Deposit : CashierNavState
    object EquipComplete : CashierNavState
    object WithdrawComplete : CashierNavState
    object DepositComplete : CashierNavState
}

sealed interface CashierRequestState {
    object Fetching : CashierRequestState
    object Done : CashierRequestState

    data class Failed(
        val msg: String
    ) : CashierRequestState
}