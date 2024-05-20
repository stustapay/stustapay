package de.stustapay.stustapay.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ionspin.kotlin.bignum.integer.BigInteger
import com.ionspin.kotlin.bignum.integer.toBigInteger
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.Account
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.repository.CustomerRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.libssp.util.mapState
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
    private val customerRepository: CustomerRepository, userRepository: UserRepository
) : ViewModel() {
    private val _requestState =
        MutableStateFlow<CustomerStatusRequestState>(CustomerStatusRequestState.Fetching)

    val uiState: StateFlow<CustomerStatusUiState> =
        _requestState.mapState(CustomerStatusUiState(), viewModelScope) { result ->
            CustomerStatusUiState(result)
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
}
