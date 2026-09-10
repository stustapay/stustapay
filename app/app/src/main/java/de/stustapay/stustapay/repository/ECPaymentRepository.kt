package de.stustapay.stustapay.repository

import android.app.Activity
import android.util.Log
import de.stustapay.libssp.util.waitFor
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.ec.SumUp
import de.stustapay.stustapay.ec.SumUpState
import de.stustapay.stustapay.ec.SumUpTapToPay
import de.stustapay.stustapay.ec.SumUpTapToPayLoginResult
import de.stustapay.stustapay.ec.SumUpTapToPayResult
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton


sealed interface ECPaymentResult {
    data class Success(val result: SumUpState.Success) : ECPaymentResult
    data class Failure(val msg: String) : ECPaymentResult
    object SilentCancelled : ECPaymentResult
}

@Singleton
class ECPaymentRepository @Inject constructor(
    private val sumUp: SumUp, private val sumUpTapToPay: SumUpTapToPay
) {
    suspend fun wakeup() {
        sumUp.wakeup()
    }

    suspend fun login(keepTrying: Boolean = false) {
        var res = sumUpTapToPay.login()

        if (res == SumUpTapToPayLoginResult.NotSupported) {
            Log.e("ec", "tap-to-pay is disabled in this build")
            return
        }

        while (keepTrying && res is SumUpTapToPayLoginResult.Error) {
            Log.e("ec", "ttp login failed: ${res.msg}")
            delay(1000)
            res = sumUpTapToPay.login()
        }
    }

    // payment with an external card reader
    suspend fun payReader(context: Activity, ecPayment: ECPayment): ECPaymentResult {

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

    // payment using the built-in nfc reader
    suspend fun payTapToPay(ecPayment: ECPayment): ECPaymentResult {
        return when (val res = sumUpTapToPay.pay(ecPayment)) {
            is SumUpTapToPayResult.Success -> ECPaymentResult.Success(
                SumUpState.Success(
                    "success", res.txCode, null
                )
            )

            is SumUpTapToPayResult.Error -> ECPaymentResult.Failure(res.msg)
            SumUpTapToPayResult.Cancelled -> ECPaymentResult.Failure("cancelled")
            SumUpTapToPayResult.NotSupported -> ECPaymentResult.Failure("tap-to-pay is disabled in this build")
        }
    }
}