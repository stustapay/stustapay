package de.stustanet.stustapay.ui.cashierstatus

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class CashierStatusViewModel @Inject constructor() : ViewModel() {
    private val _state = MutableStateFlow(CashierStatusRequestState.Fetching)

    val uiState = _state.map { state ->
        CashierStatusUiState(state)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = CashierStatusUiState()
    )

    suspend fun fetchLocal() {
        _state.update { CashierStatusRequestState.Fetching }
    }

    suspend fun fetchTag(id: ULong) {
        _state.update { CashierStatusRequestState.Fetching }
    }
}

data class CashierStatusUiState(
    val state: CashierStatusRequestState = CashierStatusRequestState.Fetching
)

sealed interface CashierStatusRequestState {
    object Fetching : CashierStatusRequestState
}