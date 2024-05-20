package de.stustapay.stustapay.ui.swap

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ionspin.kotlin.bignum.integer.toBigInteger
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.stustapay.repository.CustomerRepository
import de.stustapay.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class SwapViewModel @Inject constructor(
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _requestState = MutableStateFlow<SwapRequestState>(SwapRequestState.Done)
    private val _navState = MutableStateFlow<SwapNavState>(SwapNavState.Root)
    private val _oldTag = MutableStateFlow(NfcTag(0uL.toBigInteger(), null))
    private val _comment = MutableStateFlow("")

    val uiState = combine(
        _requestState, _navState, _oldTag, _comment,
    ) { requestState, navState, oldTag, comment ->
        SwapUiState(requestState, navState, oldTag, comment)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SwapUiState()
    )

    fun returnToRoot() {
        _navState.update { SwapNavState.Root }
    }

    fun scanOld() {
        _navState.update { SwapNavState.ScanOld }
    }
    fun scanNew() {
        _navState.update { SwapNavState.ScanNew }
    }

    suspend fun swap(newTag: NfcTag) {
        when (val res = customerRepository.switchTag(_oldTag.value, newTag, _comment.value)) {
            is Response.OK -> {
                _requestState.update { SwapRequestState.Done }
                _navState.update { SwapNavState.Complete }
            }

            is Response.Error -> {
                _requestState.update { SwapRequestState.Failed(res.msg()) }
                _navState.update { SwapNavState.Root }
            }
        }
    }

    fun setOldTagPin(pin: String) {
        _oldTag.update { NfcTag(0uL.toBigInteger(), pin) }
    }

    fun setComment(comment: String) {
        _comment.update { comment }
    }
}

sealed interface SwapNavState {
    object Root : SwapNavState
    object ScanOld : SwapNavState
    object ScanNew : SwapNavState
    object Complete : SwapNavState
}

sealed interface SwapRequestState {
    object Fetching : SwapRequestState
    object Done : SwapRequestState
    data class Failed(val msg: String) : SwapRequestState
}

data class SwapUiState(
    val request: SwapRequestState = SwapRequestState.Done,
    val nav: SwapNavState = SwapNavState.Root,
    val oldTag: NfcTag = NfcTag(0uL.toBigInteger(), null),
    val comment: String = "",
)
