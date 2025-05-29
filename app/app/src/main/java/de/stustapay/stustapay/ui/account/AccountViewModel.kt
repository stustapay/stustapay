package de.stustapay.stustapay.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.Account
import de.stustapay.api.models.DetailedOrder
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.CustomerRepository
import de.stustapay.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject


data class CustomerStatusUiState(
    val customer: CustomerStatusRequestState = CustomerStatusRequestState.Fetching,
    val canViewCustomerOrders: Boolean = false
)


sealed interface CustomerStatusRequestState {
    object Idle : CustomerStatusRequestState
    object Fetching : CustomerStatusRequestState
    data class Done(val account: Account) : CustomerStatusRequestState
    data class DoneDetails(val account: Account, val orders: List<DetailedOrder>) :
        CustomerStatusRequestState

    data class Failed(val msg: String) : CustomerStatusRequestState
}

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val customerRepository: CustomerRepository, userRepository: UserRepository
) : ViewModel() {
    private val _requestState =
        MutableStateFlow<CustomerStatusRequestState>(CustomerStatusRequestState.Fetching)
    private val _canViewCustomerOrders: Flow<Boolean> = userRepository.userState.map {
        if (it is UserState.LoggedIn) {
            Access.canViewCustomerOrders(it.user)
        } else {
            false
        }
    }

    val uiState: StateFlow<CustomerStatusUiState> =
        combine(_requestState, _canViewCustomerOrders) { requestState, canViewCustomerOrders ->
            CustomerStatusUiState(requestState, canViewCustomerOrders)
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(),
            initialValue = CustomerStatusUiState()
        )

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

    fun idleState() {
        _requestState.update { CustomerStatusRequestState.Idle }
    }

    suspend fun fetchAccount(tag: NfcTag) {
        _requestState.update { CustomerStatusRequestState.Fetching }
        when (val customer = customerRepository.getCustomer(tag.uid)) {
            is Response.OK -> {
                _requestState.update { CustomerStatusRequestState.Done(customer.data) }
            }

            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
            }
        }
    }

    suspend fun fetchCustomerOrders() {
        val state = _requestState.value
        if (state is CustomerStatusRequestState.Done) {
            val customer = state.account
            val tagUid = customer.userTagUid
            if (tagUid != null) {
                _requestState.update { CustomerStatusRequestState.Fetching }
                when (val orders = customerRepository.getCustomerOrders(tagUid)) {
                    is Response.OK -> {
                        _requestState.update {
                            CustomerStatusRequestState.DoneDetails(
                                customer, orders.data
                            )
                        }
                    }

                    is Response.Error -> {
                        _requestState.update { CustomerStatusRequestState.Failed(orders.msg()) }
                    }
                }
            }
        }
    }
}
