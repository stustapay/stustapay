package de.stustanet.stustapay.ec

import android.app.Activity
import android.os.Bundle
import com.sumup.merchant.reader.api.SumUpAPI
import com.sumup.merchant.reader.api.SumUpLogin
import com.sumup.merchant.reader.api.SumUpPayment
import com.sumup.merchant.reader.models.TransactionInfo
import de.stustanet.stustapay.R
import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.TerminalConfigState
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.util.ActivityCallback
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton
import com.sumup.merchant.reader.api.SumUpState as SumUpReaderState

data class ECTerminalInfo(
    val name: String,
    val id: String,
)

@Singleton
class SumUp @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
) {
    private val ecPaymentActivityCallbackId = 50309
    private val ecLoginActivityCallbackId = 50310
    private val ecSettingsActivityCallbackId = 50311

    private val _paymentStatus = MutableStateFlow<SumUpState>(SumUpState.None)
    val paymentStatus = _paymentStatus.asStateFlow()
    private val _status = MutableStateFlow("loading...")
    val status = _status.asStateFlow()

    fun init(activityCallback: ActivityCallback) {
        // since sumup spawns its own activity for the checkout,
        // we register the launch and callbacks to our activity.
        SumUpReaderState.init(activityCallback.context)
        activityCallback.registerHandler(ecPaymentActivityCallbackId) { resultCode, extras ->
            paymentResult(resultCode, extras)
        }
        activityCallback.registerHandler(ecLoginActivityCallbackId) { resultCode, extras ->
            loginResult(resultCode, extras)
        }
        activityCallback.registerHandler(ecSettingsActivityCallbackId) { resultCode, extras ->
            settingsResult(resultCode, extras)
        }
    }


    /**
     * initiates a ec payment.
     *
     * first, creates the payment definition,
     * then launches the sumup payment activity.
     */
    suspend fun pay(
        context: Activity,
        payment: ECPayment,
    ) {
        checkout(context, payment)
        // TODO log the payment locally on the terminal,
        //      and maybe sync it back to the core
        // TODO contact core to confirm the payment
    }

    private suspend fun checkout(
        context: Activity,
        payment: ECPayment,
    ) {
        val terminalConfig: TerminalConfig

        // TODO: cache the result :)
        terminalConfigRepository.fetchConfig()

        when (val _terminalConfig = terminalConfigRepository.terminalConfigState.value) {
            is TerminalConfigState.Success -> {
                terminalConfig = _terminalConfig.config
            }
            else -> {
                _paymentStatus.update { SumUpState.Error("terminal ec config not present") }
                return
            }
        }

        openLogin(context)

        SumUpAPI.prepareForCheckout()

        openCheckout(
            payment = payment,
            context = context,
            ecTerminalInfo = ECTerminalInfo(
                name = terminalConfig.name,
                id = terminalConfig.id.toString()
            )
        )
    }

    private fun paymentResult(activityResult: Int, extras: Bundle?) {
        if (activityResult != Activity.RESULT_OK) {
            _paymentStatus.update { SumUpState.Failed("payment activity result was: $activityResult") }
            return
        } else if (extras == null) {
            _paymentStatus.update { SumUpState.Error("no sumup payment result intent extras") }
            return
        }

        val resultCode = extras.getInt(SumUpAPI.Response.RESULT_CODE)
        if (resultCode != SumUpAPI.Response.ResultCode.SUCCESSFUL) {
            _paymentStatus.update { SumUpState.Failed("sumup api result not successful: $resultCode") }
        } else {
            val resultString = extras.getString(SumUpAPI.Response.MESSAGE)
            val txCode = extras.getString(SumUpAPI.Response.TX_CODE)
            val receiptSent = extras.getBoolean(SumUpAPI.Response.RECEIPT_SENT)

            // TODO: when we have apilevel 33:
            // val txInfo = extras.getParcelable(SumUpAPI.Response.TX_INFO, TransactionInfo::class.java)

            @Suppress("DEPRECATION")
            val txInfo = extras.getParcelable<TransactionInfo>(SumUpAPI.Response.TX_INFO)
            _paymentStatus.update { SumUpState.Success("LOLYES: ${txInfo.toString()}") }
        }
    }

    /**
     * called from MainActivity when SumUp Login Activity returns.
     */
    private fun loginResult(resultCode: Int, extras: Bundle?) {
        if (extras == null) {
            _paymentStatus.update { SumUpState.Error("no sumup login result intent extras") }
            return
        }

        when (resultCode) {
            Activity.RESULT_OK -> {
                // first user defined activity result code
                return
            }
            else -> {
                _paymentStatus.update {
                    val loginResult = extras.getInt(SumUpAPI.Response.RESULT_CODE)
                    SumUpState.Error("sumup login result code was not ok: $resultCode, login result = $loginResult")
                }
                return
            }
        }
    }

    private fun settingsResult(resultCode: Int, extras: Bundle?) {

        when (resultCode) {
            Activity.RESULT_OK -> {
                // first user defined activity result code
                return
            }
            else -> {
                _paymentStatus.update {
                    val loginResult = extras?.getInt(SumUpAPI.Response.RESULT_CODE)
                    SumUpState.Error("sumup settings result code was not ok: $resultCode, login result = $loginResult")
                }
                return
            }
        }
    }

    fun openLogin(context: Activity) {
        if (!SumUpAPI.isLoggedIn()) {
            // TODO get those from the terminal config.
            // ideally, use a per-terminal api key, which is generated by oauth.
            val sumupLogin =
                SumUpLogin.builder(context.getString(R.string.sumup_affiliate_key)).build()
            //.accessToken(context.getString(R.string.sumup_api_key)).build()

            SumUpAPI.openLoginActivity(context, sumupLogin, ecLoginActivityCallbackId)
        }


        if (!SumUpAPI.isLoggedIn()) {
            _paymentStatus.update { SumUpState.Error("not logged in, wtf?") }
            return
        }
    }

    fun openSettings(context: Activity) {
        // settings for sumup, e.g. pairing with the card terminal
        SumUpAPI.openPaymentSettingsActivity(context, ecSettingsActivityCallbackId)
    }

    fun openCheckout(context: Activity, payment: ECPayment, ecTerminalInfo: ECTerminalInfo) {
        val sumUpPayment = SumUpPayment.builder()
            // minimum 1.00
            .total(payment.amount)
            .currency(SumUpPayment.Currency.EUR)
            // optional: include a tip amount in addition to the total
            .tip(payment.tip)
            .title("StuStaPay Test")
            .receiptEmail("dummy@sft.lol")
            .receiptSMS("+00000000000")
            .addAdditionalInfo("Terminal", ecTerminalInfo.name)
            .addAdditionalInfo("TerminalID", ecTerminalInfo.id)
            // TODO convert UID to hex
            .addAdditionalInfo("Tag UID", payment.tag.uid.toString())
            // stustapay order uuid
            .foreignTransactionId(payment.id)
            // optional: skip the success screen
            //.skipSuccessScreen()
            // optional: skip the failed screen
            //.skipFailedScreen()
            .build()

        _paymentStatus.update { SumUpState.Started(payment.id) }

        // TODO: use more modern registerForActivityResult
        //       but the sumup sdk has to support it
        // this launches the sumup payment activity
        SumUpAPI.checkout(context, sumUpPayment, ecPaymentActivityCallbackId)
    }
}