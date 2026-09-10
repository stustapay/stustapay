package de.stustapay.stustapay.ec

import android.content.Context
import de.stustapay.stustapay.repository.TerminalConfigRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SumUpTapToPay @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
) {
    fun init(applicationContext: Context) {}

    suspend fun login(): SumUpTapToPayLoginResult = SumUpTapToPayLoginResult.NotSupported

    suspend fun pay(payment: ECPayment): SumUpTapToPayResult = SumUpTapToPayResult.NotSupported
}

sealed interface SumUpTapToPayResult {
    data class Success(
        val txCode: String, val serverTransactionId: String
    ) : SumUpTapToPayResult

    data class Error(
        val msg: String
    ) : SumUpTapToPayResult

    object Cancelled : SumUpTapToPayResult

    object NotSupported : SumUpTapToPayResult
}

sealed interface SumUpTapToPayLoginResult {
    object Success : SumUpTapToPayLoginResult

    data class Error(
        val msg: String
    ) : SumUpTapToPayLoginResult

    object NotSupported : SumUpTapToPayLoginResult
}
