package de.stustapay.stustapay.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ionspin.kotlin.bignum.integer.BigInteger
import com.ionspin.kotlin.bignum.integer.toBigInteger
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.Customer
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
    data class Done(val account: Customer) : CustomerStatusRequestState
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

    private val _newTag = MutableStateFlow(NfcTag(0uL.toBigInteger(), null))
    val newTag = _newTag.asStateFlow()
    private val _oldTagId = MutableStateFlow(0uL.toBigInteger())
    val oldTagId = _oldTagId.asStateFlow()

    fun idleState() {
        _requestState.update { CustomerStatusRequestState.Idle }
    }

    suspend fun setNewTag(tag: NfcTag) {
        _requestState.update { CustomerStatusRequestState.Fetching }
        _newTag.update { tag }
        when (val customer = customerRepository.getCustomer(tag.uid)) {
            is Response.OK -> {
                _requestState.update { CustomerStatusRequestState.Done(customer.data) }
            }

            is Response.Error -> {
                _requestState.update { CustomerStatusRequestState.Failed(customer.msg()) }
            }
        }
    }

    fun setOldTagId(id: BigInteger) {
        _oldTagId.update { id }
    }

    suspend fun swap(comment: String) {
        _requestState.update { CustomerStatusRequestState.Fetching }
        when (val customer = customerRepository.getCustomer(oldTagId.value)) {
            is Response.OK -> {
                when (val switch = customerRepository.switchTag(
                    customer.data.id.ulongValue(), newTag.value, comment
                )) {
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
