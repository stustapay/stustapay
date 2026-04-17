package de.stustapay.stustapay.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.Account
import de.stustapay.api.models.Order
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.display.CustomerDisplayManager
import de.stustapay.stustapay.display.CustomerDisplayState
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.repository.CustomerRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
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
    data class DoneDetails(val account: Account, val orders: List<Order>) :
        CustomerStatusRequestState

    data class Failed(val msg: String) : CustomerStatusRequestState
}

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val customerRepository: CustomerRepository,
    private val customerDisplayManager: CustomerDisplayManager,
    userRepository: UserRepository,
    terminalConfigRepository: TerminalConfigRepository,
) : ViewModel() {
    private val _requestState =
        MutableStateFlow<CustomerStatusRequestState>(CustomerStatusRequestState.Fetching)
    private val terminalLoginState = combine(
        userRepository.userState,
        terminalConfigRepository.terminalConfigState,
    ) { user, terminal ->
        TerminalLoginState(user, terminal)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = TerminalLoginState(),
    )

    private val _canViewCustomerOrders: Flow<Boolean> = terminalLoginState.map {
        it.checkUserAccess(Access::canViewCustomerOrders)
    }

    val uiState: StateFlow<CustomerStatusUiState> =
        combine(_requestState, _canViewCustomerOrders) { requestState, canViewCustomerOrders ->
            CustomerStatusUiState(requestState, canViewCustomerOrders)
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(),
            initialValue = CustomerStatusUiState()
        )

    val isSelfServiceMode: StateFlow<Boolean> = terminalLoginState.map {
        it.isSelfServiceTerminal()
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(),
        initialValue = false
    )

    val canSelfServiceBalance: StateFlow<Boolean> = terminalLoginState.map {
        it.selfServiceAccess().canSelfServiceBalance
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(),
        initialValue = false
    )

    val commentVisible = terminalLoginState.mapState(false, viewModelScope) {
        it.checkUserAccess(Access::canReadUserComment)
    }

    fun idleState() {
        _requestState.update { CustomerStatusRequestState.Idle }
    }

    fun showScanPromptOnCustomerDisplay() {
        customerDisplayManager.updateState(CustomerDisplayState.ScanChip)
    }

    fun resetCustomerDisplay() {
        customerDisplayManager.updateState(CustomerDisplayState.Welcome)
    }

    suspend fun fetchAccount(tag: NfcTag) {
        _requestState.update { CustomerStatusRequestState.Fetching }
        when (val customer = customerRepository.getCustomer(tag.uid)) {
            is Response.OK -> {
                _requestState.update { CustomerStatusRequestState.Done(customer.data) }
                customerDisplayManager.updateState(customerDisplayStateForAccount(customer.data))
            }

            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
                showScanPromptOnCustomerDisplay()
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

internal fun customerDisplayStateForAccount(account: Account): CustomerDisplayState.AccountBalance {
    return CustomerDisplayState.AccountBalance(
        accountName = account.name?.takeIf { it.isNotBlank() },
        balance = account.balance,
        voucherCount = account.vouchers.toString().takeUnless { it == "0" },
    )
}
