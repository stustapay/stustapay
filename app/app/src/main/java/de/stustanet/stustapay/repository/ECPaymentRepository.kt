package de.stustanet.stustapay.repository

import android.app.Activity
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.ec.SumUp
import de.stustanet.stustapay.ec.SumUpState
import de.stustanet.stustapay.util.waitFor
import javax.inject.Inject
import javax.inject.Singleton


sealed interface ECPaymentResult {
    data class Success(val result: SumUpState.Success) : ECPaymentResult
    data class Failure(val msg: String) : ECPaymentResult
}

@Singleton
class ECPaymentRepository @Inject constructor(
    private val sumUp: SumUp,
) {
    suspend fun pay(context: Activity, ecPayment: ECPayment): ECPaymentResult {

        // perform sumup flow
        sumUp.pay(context, ecPayment)

        val sumUpState = sumUp.paymentStatus.waitFor {
            when (it) {
                is SumUpState.Success,
                is SumUpState.Error,
                is SumUpState.Failed -> {
                    true
                }

                else -> {
                    false
                }
            }
        }

        val ret: ECPaymentResult

        // proceed to notify the server about the new topup.
        when (sumUpState) {
            is SumUpState.None,
            is SumUpState.Started -> {
                return ECPaymentResult.Failure("SumUp not finished? ${sumUpState.msg()}")
            }

            is SumUpState.Failed,
            is SumUpState.Error -> {
                return ECPaymentResult.Failure("SumUp failed: ${sumUpState.msg()}")
            }

            is SumUpState.Success -> {
                ret = ECPaymentResult.Success(sumUpState)
                // continue
            }
        }

        // TODO log the payment locally on the terminal,
        //      if core communication now fails!

        return ret
    }
}