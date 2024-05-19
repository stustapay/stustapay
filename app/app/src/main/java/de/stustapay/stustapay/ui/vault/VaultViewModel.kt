package de.stustapay.stustapay.ui.vault

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.UserInfo
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.CashierRepository
import de.stustapay.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class VaultViewModel @Inject constructor(
    private val cashierRepository: CashierRepository, private val userRepository: UserRepository
) : ViewModel() {
    private val _requestState = MutableStateFlow<VaultRequestState>(VaultRequestState.Done)
    private val _navState = MutableStateFlow<VaultNavState>(VaultNavState.Scan)
    private val _userInfo = MutableStateFlow<UserInfo?>(null)
    private val _amount = MutableStateFlow(0u)
    private val _scanState = MutableStateFlow(DialogDisplayState())

    val uiState = combine(
        _requestState.asStateFlow(),
        _navState.asStateFlow(),
        _userInfo.asStateFlow(),
        _amount.asStateFlow(),
        _scanState.asStateFlow()
    ) { requestState, navState, userInfo, amount, scanState ->
        VaultUiState(
            requestState, navState, userInfo, amount, scanState
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = VaultUiState(),
    )

    suspend fun fetchTag(tag: NfcTag) {
        _requestState.update { VaultRequestState.Fetching }
        when (val res = cashierRepository.getUserInfo(tag)) {
            is Response.OK -> {
                _userInfo.update { res.data }
                _navState.update { VaultNavState.Root }
                _requestState.update { VaultRequestState.Done }
                _scanState.update {
                    val state = DialogDisplayState()
                    state.close()
                    state
                }
            }

            is Response.Error -> {
                _requestState.update { VaultRequestState.Failed(res.msg()) }
                _scanState.update {
                    val state = DialogDisplayState()
                    state.open()
                    state
                }
            }
        }
    }

    fun reset() {
        _navState.update { VaultNavState.Scan }
        _requestState.update { VaultRequestState.Done }
        _userInfo.update { null }
        _amount.update { 0u }

        _scanState.update {
            val state = DialogDisplayState()
            state.open()
            state
        }
    }

    suspend fun initialReset() {
        _navState.update { VaultNavState.Scan }
        _requestState.update { VaultRequestState.Done }
        _userInfo.update { null }
        _amount.update { 0u }

        val userState = userRepository.userState.value
        if (userState is UserState.LoggedIn) {
            val tagUid = userState.user.userTagUid
            if (tagUid != null) {
                fetchTag(NfcTag(tagUid, null))
                _scanState.update {
                    val state = DialogDisplayState()
                    state.close()
                    state
                }
                return
            }
        }

        _scanState.update {
            val state = DialogDisplayState()
            state.open()
            state
        }
    }

    fun returnToRoot() {
        _navState.update { VaultNavState.Root }
        _scanState.update {
            val state = DialogDisplayState()
            state.close()
            state
        }
    }

    fun withdraw() {
        _navState.update { VaultNavState.Withdraw }
    }

    fun deposit() {
        _navState.update { VaultNavState.Deposit }
    }

    suspend fun completeWithdraw() {
        _requestState.update { VaultRequestState.Fetching }
        when (val res = cashierRepository.bookVault(
            _userInfo.value!!.userTagUid, _amount.value.toDouble() / 100.0
        )) {
            is Response.OK -> {
                _navState.update { VaultNavState.WithdrawComplete }
                _requestState.update { VaultRequestState.Done }
                updateCurrentUserInfo()
            }

            is Response.Error -> {
                _requestState.update { VaultRequestState.Failed(res.msg()) }
                returnToRoot()
            }
        }
    }

    suspend fun completeDeposit() {
        _requestState.update { VaultRequestState.Fetching }
        when (val res = cashierRepository.bookVault(
            _userInfo.value!!.userTagUid, -_amount.value.toDouble() / 100.0
        )) {
            is Response.OK -> {
                _navState.update { VaultNavState.DepositComplete }
                _requestState.update { VaultRequestState.Done }
                updateCurrentUserInfo()
            }

            is Response.Error -> {
                _requestState.update { VaultRequestState.Failed(res.msg()) }
                returnToRoot()
            }
        }
    }

    fun setAmount(amount: UInt) {
        _amount.update { amount }
    }

    private suspend fun updateCurrentUserInfo() {
        val tagUid = _userInfo.value?.userTagUid
        if (tagUid != null) {
            when (val res = cashierRepository.getUserInfo(NfcTag(tagUid, null))) {
                is Response.OK -> {
                    _userInfo.update { res.data }
                    _requestState.update { VaultRequestState.Done }
                }

                is Response.Error -> {
                    _requestState.update { VaultRequestState.Failed(res.msg()) }
                }
            }
        }
    }
}

data class VaultUiState(
    val request: VaultRequestState = VaultRequestState.Done,
    val nav: VaultNavState = VaultNavState.Scan,
    val userInfo: UserInfo? = null,
    val amount: UInt = 0u,
    val scanState: DialogDisplayState = DialogDisplayState()
)

sealed interface VaultNavState {
    object Root : VaultNavState
    object Scan : VaultNavState
    object Withdraw : VaultNavState
    object Deposit : VaultNavState
    object WithdrawComplete : VaultNavState
    object DepositComplete : VaultNavState
}

sealed interface VaultRequestState {
    object Fetching : VaultRequestState
    object Done : VaultRequestState

    data class Failed(
        val msg: String
    ) : VaultRequestState
}