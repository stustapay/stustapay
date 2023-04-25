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

    fun inputDigit(d: UInt): UInt {
        _amount.update {
            var new = it
            if (new + (d % 10u) < UInt.MAX_VALUE / 10u) {
                new *= 10u
                new += (d % 10u)
            }
            new
        }

        return _amount.value
    }

    fun clear() {
        _amount.update { 0u }
    }
}