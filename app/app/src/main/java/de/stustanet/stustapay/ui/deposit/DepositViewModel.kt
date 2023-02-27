package de.stustanet.stustapay.ui.deposit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class DepositViewModel @Inject constructor() : ViewModel() {
    private val _currentAmount = MutableStateFlow(0u)
    private val _chipScanned = MutableStateFlow(false)

    val uiState = combine(
        _currentAmount,
        _chipScanned
    ) { currentAmount, chipScanned ->
        DepositUiState(
            currentAmount = currentAmount,
            chipScanned = chipScanned
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

    fun reset() {
        _chipScanned.value = false
        _currentAmount.value = 0u
    }

    fun scanSuccessful(id: ULong) {
        _chipScanned.value = true
    }
}

data class DepositUiState (
   var currentAmount: UInt = 0u,
   var chipScanned: Boolean = false
)