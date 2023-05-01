package de.stustanet.stustapay.ui.priceselect

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


@HiltViewModel
class PriceSelectionViewModel @Inject constructor() : ViewModel() {

    /** amount in cents */
    private val _amount = MutableStateFlow(0u)
    val amount = _amount.asStateFlow()

    private val _allowCents = MutableStateFlow(true)

    fun setAmount(amount: UInt) {
        _amount.update { amount }
    }

    fun allowCents(allow: Boolean) {
        _allowCents.update { allow }
    }

    fun inputDigit(d: UInt): UInt {
        _amount.update {
            var new = it
            val limit = 1000000u
            if (new + (d % 10u) < limit) {
                new *= 10u
                new += (d % 10u)

                // current value is 0, and we got an input -> directly enter euro
                if (it == 0u && !_allowCents.value) {
                    new *= 100u
                }
            } else {
                new = limit
            }
            new
        }

        return _amount.value
    }

    fun clear() {
        _amount.update { 0u }
    }
}