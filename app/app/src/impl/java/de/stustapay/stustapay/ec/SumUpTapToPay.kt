package de.stustapay.stustapay.ec

import android.content.Context
import android.util.Log
import com.sumup.receipts.core.data.extensions.toApiError
import com.sumup.taptopay.TapToPay
import com.sumup.taptopay.TapToPayApiProvider
import com.sumup.taptopay.auth.AuthTokenProvider
import com.sumup.taptopay.payment.domain.model.api.AffiliateModel
import com.sumup.taptopay.payment.domain.model.api.CheckoutData
import com.sumup.taptopay.payment.domain.model.api.PaymentEvent
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.lastOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import javax.inject.Inject
import javax.inject.Singleton

/*
 * Notes on setting up TTP:
 *  - Google play services must be enabled (i.e. there must be a Google account signed in to the
 *    device) to ensure availability of the TrustedTime API
 *  - Only Sandbox accounts can be used when the app is compiled in debug mode (auth error otherwise)
 *  - The debugger must be disconnected to launch the app and when using the API, but can be connected
 *    after to view logs (unless the app is non-debuggable - then the app just launches normally for
 *    some reason)
 *  - The affiliate key must be present in the request
 *  - Amounts must be specified in cents
 *  - The API really does need to be initialized as soon as possible (auth error otherwise)
 *  - Be careful which account you authenticate with when using OAuth! It may look like the sandbox
 *    but is likely the real account. If you get strange errors about turning off debug features or
 *    contacting SumUp support, you are definitely using the production credentials.
 *  - Debug features (USB debugging, dev mode, debuggable app build) must be turned off to use
 *    production credentials
 *  - The OAuth application doesn't actually require 'payments' permissions
 *  - Debuggable build is not required to use sandbox credentials
 *  - API must be torn down when switching credentials, even after restarting / reinstalling the app
 *    (SumUp has some sort of persistent internal state)
 */

@Singleton
class SumUpTapToPay @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
) {
    var state = MutableStateFlow<SumUpTapToPayState>(SumUpTapToPayState.Uninitialized)

    fun init(applicationContext: Context) {
        val api = TapToPayApiProvider.provide(applicationContext)
        Log.i("ttp", "api init start")
        state.update {
            SumUpTapToPayState.Initializing(api)
        }
    }

    suspend fun login(): SumUpTapToPayLoginResult {
        val terminalConfig =
            (terminalConfigRepository.terminalConfigState.value as? TerminalConfigState.Success)?.config
                ?: return SumUpTapToPayLoginResult.Error("terminal not registered")

        val sumupSecrets = terminalConfig.till?.sumupSecrets
            ?: return SumUpTapToPayLoginResult.Error("no sumup secret available")

        // ensure the api either hasn't been initialized or has been initialized with a different key
        val api = when (val state = state.value) {
            is SumUpTapToPayState.Initializing -> state.api
            is SumUpTapToPayState.Ready -> {
                if (state.initializedWithKey == sumupSecrets.sumupApiKey.takeLast(4)) {
                    return SumUpTapToPayLoginResult.Success
                } else {
                    state.api
                }
            }

            SumUpTapToPayState.Uninitialized -> return SumUpTapToPayLoginResult.Error("api not initialized")
        }

        // completely reinit the api to ensure any stale state is completely removed
        api.tearDown().onFailure {
            val e = it.toApiError()
            Log.e("ttp", "api teardown failed: ${e.code} ${e.message}")
            Log.e("ttp", "${e.details}")
        }.onSuccess {
            Log.i("ttp", "api teardown done")
        }

        api.init(object : AuthTokenProvider {
            override fun getAccessToken(): String {
                return sumupSecrets.sumupApiKey
            }
        }).onFailure {
            val e = it.toApiError()
            Log.e("ttp", "api init failed: ${e.code} ${e.message}")
            Log.e("ttp", "${e.details}")
            return SumUpTapToPayLoginResult.Error("api init failed")
        }.onSuccess {
            Log.i("ttp", "api init done")
            state.update { SumUpTapToPayState.Ready(api, sumupSecrets.sumupApiKey.takeLast(4)) }
        }

        return SumUpTapToPayLoginResult.Success
    }


    suspend fun pay(payment: ECPayment): SumUpTapToPayResult {
        val api =
            (state.value as? SumUpTapToPayState.Ready)?.api ?: return SumUpTapToPayResult.Error(
                "not logged in"
            )

        val terminalConfig =
            (terminalConfigRepository.terminalConfigState.value as? TerminalConfigState.Success)?.config
                ?: return SumUpTapToPayResult.Error("terminal not registered")

        val sumupSecrets = terminalConfig.till?.sumupSecrets
            ?: return SumUpTapToPayResult.Error("no sumup secret available")

        val paymentResult = api.startPayment(
            checkoutData = CheckoutData(
                totalAmount = (payment.amount * BigDecimal(100)).toLong(),
                tipsAmount = (payment.tip * BigDecimal(100)).toLong(),
                vatAmount = null,
                clientUniqueTransactionId = payment.id,
                customItems = null,
                priceItems = null,
                products = null,
                processCardAs = null,
                affiliateData = AffiliateModel(
                    key = sumupSecrets.sumupAffiliateKey,
                    foreignTransactionId = payment.id,
                    tags = mapOf(
                        Pair("Terminal", terminalConfig.name),
                        Pair("TerminalID", terminalConfig.id.toString()),
                        Pair("Tag", payment.tag.toString())
                    )
                )
            ), skipSuccessScreen = true, timeoutCardWaitSeconds = null
        ).catch {
            val e = it.toApiError()
            Log.e("ttp", "payment exception: ${e.code} ${e.message}")
            Log.e("ttp", "${e.details}")
        }.map {
            Log.i("ttp", "payment event: $it")
            it
        }.lastOrNull()

        return when (paymentResult) {
            is PaymentEvent.PaymentFlowClosedSuccessfully -> SumUpTapToPayResult.Success(
                paymentResult.paymentOutput.txCode, paymentResult.paymentOutput.serverTransactionId
            )

            is PaymentEvent.TransactionCanceled -> SumUpTapToPayResult.Cancelled
            else -> SumUpTapToPayResult.Error("$paymentResult")
        }
    }
}

sealed interface SumUpTapToPayState {
    // set on start up
    object Uninitialized : SumUpTapToPayState

    // after application has been registered, but login hasn't happened yet
    data class Initializing(
        val api: TapToPay
    ) : SumUpTapToPayState

    // normal state while the app is running
    // part of the key is stored so we can reinitialize when it changes
    data class Ready(
        val api: TapToPay, val initializedWithKey: String
    ) : SumUpTapToPayState
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
