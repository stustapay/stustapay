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
}

@Singleton
class ECPaymentRepository @Inject constructor(
    private val sumUp: SumUp,
    private val terminalConfigRepository: TerminalConfigRepository,
)
{
    fun isReady(): Boolean {
        return sumUp.isLoggedIn()
    }

    suspend fun startCardReaderSetup(context: Activity): String? {
        return try {
            sumUp.cardReaderSettings(context)
            when (val state = sumUp.paymentStatus.value) {
                is SumUpState.Error -> state.msg
                is SumUpState.Failed -> state.msg
                else -> null
            }
        } catch (exc: Exception) {
            exc.message ?: "EC reader setup could not be started."
        }
    }

    suspend fun wakeup() {
        sumUp.wakeup()
    }

    suspend fun pay(context: Activity, ecPayment: ECPayment): ECPaymentResult {
        // Refresh terminal configuration to ensure we have the latest SumUp token
        terminalConfigRepository.fetchConfig(keepTrying = false)

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

        return ret
    }
}
