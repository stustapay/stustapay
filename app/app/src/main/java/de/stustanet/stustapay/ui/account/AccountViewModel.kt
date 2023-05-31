package de.stustanet.stustapay.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.model.Account
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CustomerRepository
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


data class CustomerStatusUiState(
    val customer: CustomerStatusRequestState = CustomerStatusRequestState.Fetching
)


sealed interface CustomerStatusRequestState {
    object Idle : CustomerStatusRequestState
    object Fetching : CustomerStatusRequestState
    data class Done(val account: Account) : CustomerStatusRequestState
    data class Failed(val msg: String) : CustomerStatusRequestState
}


@HiltViewModel
class AccountViewModel @Inject constructor(
    private val customerRepository: CustomerRepository,
    userRepository: UserRepository
) : ViewModel() {
    private val _requestState =
        MutableStateFlow<CustomerStatusRequestState>(CustomerStatusRequestState.Fetching)

    val uiState: StateFlow<CustomerStatusUiState> =
        _requestState.mapState(CustomerStatusUiState(), viewModelScope) { result ->
            CustomerStatusUiState(result)
        }

    val swapVisible = userRepository.userState.mapState(false, viewModelScope) {
        when (it) {
            is UserState.LoggedIn -> {
                Access.canSwap(it.user)
            }
            is UserState.NoLogin -> {
                false
            }
            is UserState.Error -> {
                false
            }
        }
    }

    val commentVisible = userRepository.userState.mapState(false, viewModelScope) {
        when (it) {
            is UserState.LoggedIn -> {
                Access.canReadUserComment(it.user)
            }
            is UserState.NoLogin -> {
                false
            }
            is UserState.Error -> {
                false
            }
        }
    }

    private val _newTagId = MutableStateFlow(0uL)
    val newTagId = _newTagId.asStateFlow()
    private val _oldTagId = MutableStateFlow(0uL)
    val oldTagId = _oldTagId.asStateFlow()

    fun idleState() {
        _requestState.update { CustomerStatusRequestState.Idle }
    }

    suspend fun setNewTagId(id: ULong) {
        _requestState.update { CustomerStatusRequestState.Fetching }
        _newTagId.update { id }
        when (val customer = customerRepository.getCustomer(id)) {
            is Response.OK -> {
                _requestState.update { CustomerStatusRequestState.Done(customer.data) }
            }

            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
            }
        }
    }

    fun setOldTagId(id: ULong) {
        _oldTagId.update { id }
    }

    suspend fun swap(comment: String) {
        _requestState.update { CustomerStatusRequestState.Fetching }
        when (val customer = customerRepository.getCustomer(oldTagId.value)) {
            is Response.OK -> {
                when (val switch = customerRepository.switchTag(customer.data.id, newTagId.value, comment)) {
                    is Response.OK -> {
                        _requestState.update { CustomerStatusRequestState.Done(customer.data) }
                    }
                    is Response.Error -> {
                        _requestState.update { CustomerStatusRequestState.Failed(switch.msg()) }
                    }
                }
            }
            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
            }
        }
    }
}
