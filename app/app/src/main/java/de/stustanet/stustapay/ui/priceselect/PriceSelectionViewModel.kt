package de.stustanet.stustapay.ui.priceselect

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

const val LIMIT = 10000u

@HiltViewModel
class PriceSelectionViewModel @Inject constructor() : ViewModel() {

    /** amount in cents */
    private val _amount = MutableStateFlow(0u)
    val amount = _amount.map { amount ->
        if (_allowCents.value) {
            amount
        } else {
            amount * 100u
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = 0u
    )

    private val _allowCents = MutableStateFlow(true)

    fun setAmount(amount: UInt) {
        if (_allowCents.value) {
            _amount.update { amount }
        } else {
            _amount.update { amount / 100u }
        }
    }

    fun allowCents(allow: Boolean) {
        _allowCents.update { allow }
    }

    fun inputDigit(d: UInt): UInt {
        _amount.update {
            var new = it
            if (new * 10u < LIMIT) {
                new *= 10u
                new += (d % 10u)
            } else {
                new = LIMIT
            }
            new
        }

        return if (_allowCents.value) {
            _amount.value
        } else {
            _amount.value * 100u
        }
    }

    fun clear() {
        _amount.update { 0u }
    }
}