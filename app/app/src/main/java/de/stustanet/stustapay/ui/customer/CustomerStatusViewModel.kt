package de.stustanet.stustapay.ui.customer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.model.Customer
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CustomerRepository
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


data class CustomerStatusUiState(
    val state: CustomerStatusRequestState = CustomerStatusRequestState.Fetching
)


sealed interface CustomerStatusRequestState {
    object Fetching : CustomerStatusRequestState
    data class Done(val customer: Customer) : CustomerStatusRequestState
    data class Failed(val msg: String) : CustomerStatusRequestState
    data class Swap(val newTag: UserTag) : CustomerStatusRequestState
    object SwapDone : CustomerStatusRequestState
}


@HiltViewModel
class CustomerStatusViewModel @Inject constructor(
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
            else -> {
                false
            }
        }
    }

    fun startScan() {
        _requestState.update { CustomerStatusRequestState.Fetching }
    }

    suspend fun completeScan(id: ULong) {
        when (val customer = customerRepository.getCustomer(id)) {
            is Response.OK -> {
                _requestState.update { CustomerStatusRequestState.Done(customer.data) }
            }

            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
            }
        }
    }

    fun startSwap(newTag: UserTag) {
        _requestState.update { CustomerStatusRequestState.Swap(newTag) }
    }

    suspend fun completeSwap(customerTagId: ULong, newTag: UserTag) {
        when (val customer = customerRepository.getCustomer(customerTagId)) {
            is Response.OK -> {
                if (customerRepository.switchTag(customer.data.id, newTag) is Response.OK) {
                    _requestState.update { CustomerStatusRequestState.SwapDone }
                    return
                }
            }

            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
            }
        }
    }
}
