package de.stustanet.stustapay.ui.status

import androidx.compose.runtime.remember
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.Account
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CustomerRepository
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class CustomerStatusViewModel @Inject constructor(
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _requestState =
        MutableStateFlow<CustomerStatusRequestState>(CustomerStatusRequestState.Fetching)

    val uiState: StateFlow<CustomerStatusUiState> = _requestState.map { result ->
        CustomerStatusUiState(result)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CustomerStatusUiState()
    )

    fun startScan() {
        _requestState.update { CustomerStatusRequestState.Fetching }
    }

    suspend fun completeScan(id: ULong) {
        when (val customer = customerRepository.getCustomer(id)) {
            is Response.OK -> {
                _requestState.update { CustomerStatusRequestState.Done(customer.data) }
            }
            else -> {
                _requestState.update { CustomerStatusRequestState.Failed }
            }
        }
    }

    fun startSwap(newTagId: ULong) {
        _requestState.update { CustomerStatusRequestState.Swap(newTagId) }
    }

    suspend fun completeSwap(customerTagId: ULong, newTagId: ULong) {
        val customer = customerRepository.getCustomer(customerTagId)
        if (customer is Response.OK) {
            if (customerRepository.switchTag(customer.data.id, newTagId) is Response.OK) {
                _requestState.update { CustomerStatusRequestState.SwapDone }
                return
            }
        }

        _requestState.update { CustomerStatusRequestState.Failed }
    }
}

data class CustomerStatusUiState(
    val state: CustomerStatusRequestState = CustomerStatusRequestState.Fetching
)

sealed interface CustomerStatusRequestState {
    object Fetching : CustomerStatusRequestState
    data class Done(val customer: Account) : CustomerStatusRequestState
    object Failed : CustomerStatusRequestState
    data class Swap(val newTagId: ULong) : CustomerStatusRequestState
    object SwapDone : CustomerStatusRequestState
}