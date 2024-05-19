package de.stustapay.stustapay.ui.swap

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
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class SwapViewModel @Inject constructor(
    private val customerRepository: CustomerRepository, userRepository: UserRepository
) : ViewModel() {
    private val _requestState = MutableStateFlow<SwapRequestState>(SwapRequestState.Done)
    private val _navState = MutableStateFlow<SwapNavState>(SwapNavState.Root)
    private val _newTag = MutableStateFlow(NfcTag(0uL.toBigInteger(), null))
    private val _oldTag = MutableStateFlow(NfcTag(0uL.toBigInteger(), null))
    private val _comment = MutableStateFlow("")


    val uiState = combine(
        _requestState, _navState, _newTag, _oldTag, _comment
    ) { requestState, navState, newTag, oldTag, comment ->
        SwapUiState(requestState, navState, newTag, oldTag, comment)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SwapUiState()
    )
}

sealed interface SwapNavState {
    object Root : SwapNavState
}

sealed interface SwapRequestState {
    object Fetching : SwapRequestState
    object Done : SwapRequestState
    data class Failed(val msg: String) : SwapRequestState
}

data class SwapUiState(
    val request: SwapRequestState = SwapRequestState.Done,
    val nav: SwapNavState = SwapNavState.Root,
    val newTag: NfcTag = NfcTag(0uL.toBigInteger(), null),
    val oldTag: NfcTag = NfcTag(0uL.toBigInteger(), null),
    val comment: String = ""
)
