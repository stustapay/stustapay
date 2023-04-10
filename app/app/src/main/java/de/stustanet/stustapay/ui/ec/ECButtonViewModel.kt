package de.stustanet.stustapay.ui.ec

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.ec.SumUp
import de.stustanet.stustapay.ec.SumUpState
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

sealed interface ECState {
    object None : ECState

    data class Success(
        val msg: String
    ) : ECState

    data class Error(
        val msg: String
    ) : ECState
}


@HiltViewModel
class ECButtonViewModel @Inject constructor(
    private val sumUp: SumUp
) : ViewModel() {

    val ecState: StateFlow<ECState> = sumUp.paymentStatus
        .mapState(ECState.None, viewModelScope) { sumUpState ->
            when (sumUpState) {
                is SumUpState.None, is SumUpState.Started -> {
                    ECState.None
                }
                is SumUpState.Success -> {
                    ECState.Success(sumUpState.msg())
                }
                is SumUpState.Failed, is SumUpState.Error -> {
                    ECState.Error(sumUpState.msg())
                }
            }
        }

    suspend fun pay(context: Activity, ecPayment: ECPayment) {
        // TODO: contact core to get a transaction id
        sumUp.pay(context, ecPayment)
        // TODO log the payment locally on the terminal,
        //      and maybe sync it back to the core
        // TODO contact core to confirm the payment
    }
}