package de.stustapay.stustapay.repository

import android.app.Activity
import de.stustapay.libssp.util.waitFor
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.ec.SumUp
import de.stustapay.stustapay.ec.SumUpState
import javax.inject.Inject
import javax.inject.Singleton


sealed interface ECPaymentResult {
    data class Success(val result: SumUpState.Success) : ECPaymentResult
    data class Failure(val msg: String) : ECPaymentResult
    object SilentCancelled : ECPaymentResult
}

@Singleton
class ECPaymentRepository @Inject constructor(
    private val sumUp: SumUp,
) {
    suspend fun wakeup() {
        sumUp.wakeup()
    }

    suspend fun pay(context: Activity, ecPayment: ECPayment): ECPaymentResult {

        // perform sumup flow
        sumUp.pay(context, ecPayment)

        val sumUpState = sumUp.paymentStatus.waitFor {
            when (it) {
                is SumUpState.Success, is SumUpState.Error, is SumUpState.Failed -> {
                    true
                }

                else -> {
                    false
                }
            }
        }

        // proceed to notify the server about the new topup.
        when (sumUpState) {
            is SumUpState.None, is SumUpState.Started -> {
                return ECPaymentResult.Failure("SumUp not finished? ${sumUpState.msg()}")
            }

            is SumUpState.Failed, is SumUpState.Error -> {
                return ECPaymentResult.Failure("SumUp failed: ${sumUpState.msg()}")
            }

            is SumUpState.Success -> {
                return if (sumUpState.txInfo?.foreignTransactionId == ecPayment.id) {
                    ECPaymentResult.Success(sumUpState)
                } else {
                    // If the IDs don't match, we must have multiple pending card payments running
                    // simultaneously, therefore only allow the one that was actually paid to
                    // proceed and cancel all others
                    ECPaymentResult.SilentCancelled
                }
            }
        }
    }
}