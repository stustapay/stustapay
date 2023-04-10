package de.stustanet.stustapay.ui.deposit

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.ec.ECState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import java.util.*
import javax.inject.Inject

enum class DepositPage(val route: String) {
    Amount("amount"),
    Cash("cash"),
    Done("done"),
    Failure("aborted"),
}

data class DepositState(
    /** desired deposit amount in cents */
    var currentAmount: UInt = 0u,
    var status: String = "ready",
)

@HiltViewModel
class DepositViewModel @Inject constructor() : ViewModel() {
    val navState = MutableStateFlow(DepositPage.Amount)

    private val _depositState = MutableStateFlow(DepositState())
    val depositState = _depositState.asStateFlow()


    fun inputDigit(d: UInt) {
        _depositState.update {
            val state = it.copy()
            state.status = ""
            state.currentAmount *= 10u
            state.currentAmount += (d % 10u)
            state
        }
    }

    fun clear() {
        _depositState.update {
            DepositState()
        }
    }

    /** validates the amount so we can continue to checkout */
    fun checkAmount(): Boolean {
        val minimum = 100U
        if (_depositState.value.currentAmount < minimum) {
            _depositState.update { it.copy(status = "at least ${minimum.toFloat() / 100} needed") }
            return false
        }
        return true
    }

    /**
     * creates a ec payment with new id for the current selected sum.
     */
    fun getECPayment(userTag: UserTag): ECPayment {
        return ECPayment(
            id = UUID.randomUUID().toString(),
            amount = BigDecimal(_depositState.value.currentAmount.toLong()),
            tag = userTag,
        )
    }

    fun cashFinished(tag: UserTag) {
        // TODO: send to backend
        _depositState.update {
            it.copy(status = "cash for $tag not yet booked :)")
        }
        navState.update { DepositPage.Done }
    }

    fun ecFinished(ecState: ECState) {
        when (ecState) {
            is ECState.None -> {}
            is ECState.Success -> {
                // TODO: send to backend
                _depositState.update {
                    it.copy(status = "error: ${ecState.msg}")
                }
                navState.update { DepositPage.Done }
            }
            is ECState.Error -> {
                _depositState.update {
                    it.copy(status = "error: ${ecState.msg}")
                }
                navState.update { DepositPage.Failure }
            }
        }
    }
}