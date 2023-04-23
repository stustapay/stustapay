package de.stustanet.stustapay.ui.status

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

    fun startSwap(id: ULong) {
        _requestState.update { CustomerStatusRequestState.Swap(id) }
    }

    fun completeSwap(a: ULong, b: ULong) {
        _requestState.update { CustomerStatusRequestState.SwapDone }
    }
}

data class CustomerStatusUiState(
    val state: CustomerStatusRequestState = CustomerStatusRequestState.Fetching
)

sealed interface CustomerStatusRequestState {
    object Fetching : CustomerStatusRequestState
    data class Done(val customer: Account) : CustomerStatusRequestState
    object Failed : CustomerStatusRequestState
    data class Swap(val id: ULong) : CustomerStatusRequestState
    object SwapDone : CustomerStatusRequestState
}