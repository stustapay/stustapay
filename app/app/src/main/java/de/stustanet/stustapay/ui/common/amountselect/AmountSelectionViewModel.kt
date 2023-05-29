package de.stustanet.stustapay.ui.common.amountselect

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.*
import javax.inject.Inject


@HiltViewModel
class AmountSelectionViewModel @Inject constructor() : ViewModel() {
    private val _config = MutableStateFlow<AmountConfig>(AmountConfig.Number())

    /**
     * if we handle money, amount is stored in cents or euro directly,
     * if cents are disabled
     */
    private val _amount = MutableStateFlow(0u)

    /**
     * provides the stored amount - if we have money, always provides in cents.
     */
    val amount = _amount.mapState(0u, viewModelScope) { amount ->
        mapAmount(amount)
    }

    /**
     * depending on the amount kind, we have to convert our stored value to the outside world.
     */
    private fun mapAmount(rawAmount: UInt) : UInt {
        return when (val cfg = _config.value) {
            is AmountConfig.Money -> {
                if (cfg.cents) {
                    rawAmount
                } else {
                    rawAmount * 100u
                }
            }

            is AmountConfig.Number -> {
                rawAmount
            }
        }
    }

    /**
     * manually update the amount to some value.
     * if we have money, always accepts cents (no matter the cents config)
     * if cents are disabled in the config, round to euros.
     */
    fun setAmount(amount: UInt) {

        when (val cfg = _config.value) {
            is AmountConfig.Money -> {
                if (cfg.cents) {
                    _amount.update { amount }
                } else {
                    _amount.update { amount / 100u }
                }
            }

            is AmountConfig.Number -> {
                _amount.update { amount }
            }
        }
    }

    fun updateConfig(amountConfig: AmountConfig) {
        _config.update { amountConfig }
    }

    fun inputDigit(d: UInt): UInt {
        _amount.update {
            val limit = _config.value.limit()
            var new = it
            if (new * 10u < limit) {
                new *= 10u
                new += (d % 10u)
            } else {
                new = limit
            }
            new
        }

        return mapAmount(_amount.value)
    }

    fun clear() {
        _amount.update { 0u }
    }
}