package de.stustanet.stustapay.ui.cashier

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.UserInfo
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CashierRepository
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class CashierStatusViewModel @Inject constructor(
    private val cashierRepository: CashierRepository,
    private val userRepository: UserRepository
) : ViewModel() {
    private val _state =
        MutableStateFlow<CashierStatusRequestState>(CashierStatusRequestState.Fetching)

    val uiState = _state.mapState(CashierStatusUiState(), viewModelScope) { state ->
        CashierStatusUiState(state)
    }

    suspend fun fetchLocal() {
        _state.update { CashierStatusRequestState.Fetching }
        val user = userRepository.userState.value
        if (user is UserState.LoggedIn && user.user.user_tag_uid != null) {
            fetchTag(user.user.user_tag_uid!!)
        } else {
            _state.update { CashierStatusRequestState.Failed("Not logged in") }
        }
    }

    suspend fun fetchTag(id: ULong) {
        _state.update { CashierStatusRequestState.Fetching }
        when (val res = cashierRepository.getCashierInfo(id)) {
            is Response.OK -> {
                _state.update { CashierStatusRequestState.Done(res.data) }
            }
            is Response.Error -> {
                _state.update { CashierStatusRequestState.Failed(res.msg()) }
            }
        }
    }
}

data class CashierStatusUiState(
    val state: CashierStatusRequestState = CashierStatusRequestState.Fetching
)

sealed interface CashierStatusRequestState {
    object Fetching : CashierStatusRequestState
    data class Done(
        val userInfo: UserInfo
    ) : CashierStatusRequestState

    data class Failed(
        val msg: String
    ) : CashierStatusRequestState
}