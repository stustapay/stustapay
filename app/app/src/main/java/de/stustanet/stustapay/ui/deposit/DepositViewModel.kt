package de.stustanet.stustapay.ui.deposit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class DepositViewModel @Inject constructor() : ViewModel() {
    private val _currentAmount = MutableStateFlow(0u)

    val uiState = _currentAmount.map { currentAmount ->
        DepositUiState(
            currentAmount = currentAmount
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = DepositUiState()
    )

    fun inputDigit(d: UInt) {
        _currentAmount.value *= 10u
        _currentAmount.value += (d % 10u)
    }

    fun clear() {
        _currentAmount.value = 0u
    }
}

data class DepositUiState (
   var currentAmount: UInt = 0u,
)