package de.stustanet.stustapay.ui.ec

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.repository.SumUpRepository
import de.stustanet.stustapay.repository.SumUpState
import de.stustanet.stustapay.util.asResult
import de.stustanet.stustapay.util.Result
import kotlinx.coroutines.flow.*
import java.math.BigDecimal
import javax.inject.Inject

sealed interface SumUpUIState {
    object Loading : SumUpUIState

    object None : SumUpUIState

    data class Error(
        val msg: String
    ) : SumUpUIState

    data class Success(
        val msg: String
    ) : SumUpUIState
}


@HiltViewModel
class SumUpViewModel @Inject constructor(
    private val sumUpRepo: SumUpRepository
) : ViewModel() {

    val ecUIState: StateFlow<SumUpUIState> = sumUpUIState(sumUpRepo).stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = SumUpUIState.Loading
    )

    suspend fun pay(context: Activity, total: BigDecimal, tip: BigDecimal = BigDecimal(0)) {
        sumUpRepo.pay(context, total, tip)
    }

}

private fun sumUpUIState(
    sumUpRepo: SumUpRepository
): Flow<SumUpUIState> {

    return sumUpRepo.paymentStatus.asResult()
        .map { sumUpStateResult ->
            when (sumUpStateResult) {
                is Result.Loading -> {
                    SumUpUIState.Loading
                }
                is Result.Error -> {
                    SumUpUIState.Error(
                        sumUpStateResult.exception?.localizedMessage
                            ?: "unknown payment error"
                    )
                }
                is Result.Success -> {
                    when (val sumUpState : SumUpState = sumUpStateResult.data) {
                        is SumUpState.Success -> {
                            SumUpUIState.Success(sumUpState.transactionId)
                        }
                        is SumUpState.Failed -> {
                            SumUpUIState.Error("Transaction Failed: ${sumUpState.msg}")
                        }
                        else -> {
                            SumUpUIState.None
                        }
                    }
                }
            }
        }
}
