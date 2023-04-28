package de.stustanet.stustapay.ec

import android.app.Activity
import android.os.Bundle
import android.util.Log
import com.sumup.merchant.reader.api.SumUpAPI
import com.sumup.merchant.reader.api.SumUpLogin
import com.sumup.merchant.reader.api.SumUpPayment
import com.sumup.merchant.reader.models.TransactionInfo
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.util.ActivityCallback
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton
import com.sumup.merchant.reader.api.SumUpState as SumUpReaderState

data class ECTerminalConfig(
    val name: String,
    val id: String,
)

data class SumUpConfig(
    val affiliateKey: String,
    val terminal: ECTerminalConfig,
)

sealed interface SumUpConfigState {
    data class OK(val cfg: SumUpConfig) : SumUpConfigState
    data class Error(val msg: String) : SumUpConfigState
}

enum class SumUpAction {
    None,
    Login,
    Checkout,
    Settings,
    CardReader,
}

val sumUpActionDependencies: Map<SumUpAction, List<SumUpAction>> = mapOf(
    Pair(SumUpAction.Login, listOf()),
    Pair(SumUpAction.Checkout, listOf(SumUpAction.Login)),
    Pair(SumUpAction.Settings, listOf(SumUpAction.Login)),
    Pair(SumUpAction.CardReader, listOf(SumUpAction.Login)),
)

data class PaymentState(
    /**
     * since the activity launching returns by callbacks,
     * we need to remember what we wanted to do...
     */
    var targetAction: SumUpAction = SumUpAction.None,
    var config: SumUpConfig? = null,
    var payment: ECPayment? = null,
    var actionsDone: MutableSet<SumUpAction> = mutableSetOf()
)

/**
 * represents the sumup interaction.
 * I'm sorry, but this whole global state machine mess is because all of sumup's state is global.
 */
@Singleton
class SumUp @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
) {
    private val ecPaymentActivityCallbackId = 50309
    private val ecLoginActivityCallbackId = 50310
    private val ecSettingsActivityCallbackId = 50311
    private val ecCardReaderActivityCallbackId = 50312

    private val _paymentStatus = MutableStateFlow<SumUpState>(SumUpState.None)

    /** payment progress */
    val paymentStatus = _paymentStatus.asStateFlow()

    private val _status = MutableStateFlow("loading...")

    /** status message */
    val status = _status.asStateFlow()


    enum class SumUpResultCode(val code: Int) {
        SUCCESSFUL(1),
        ERROR_TRANSACTION_FAILED(2),
        ERROR_GEOLOCATION_REQUIRED(3),
        ERROR_INVALID_PARAM(4),
        ERROR_INVALID_TOKEN(5),
        ERROR_NO_CONNECTIVITY(6),
        ERROR_PERMISSION_DENIED(7),
        ERROR_NOT_LOGGED_IN(8),
        ERROR_DUPLICATE_FOREIGN_TX_ID(9),
        ERROR_INVALID_AFFILIATE_KEY(10),
        ERROR_ALREADY_LOGGED_IN(11),
        ERROR_INVALID_AMOUNT_DECIMALS(12),
        ERROR_API_LEVEL_TOO_LOW(13),
        ;

        companion object {
            private val map = SumUpResultCode.values().associateBy(SumUpResultCode::code)
            fun fromInt(type: Int) = map[type]
        }
    }

    /**
     * global configuration for our statemachine...
     */
    private var paymentState = PaymentState()

    fun init(activityCallback: ActivityCallback) {
        val activity = activityCallback.context as Activity

        // since sumup spawns its own activity for the checkout,
        // we register the launch and callbacks to our activity.
        SumUpReaderState.init(activity)
        activityCallback.registerHandler(ecPaymentActivityCallbackId) { resultCode, extras ->
            paymentResult(activity, resultCode, extras)
        }
        activityCallback.registerHandler(ecLoginActivityCallbackId) { resultCode, extras ->
            loginResult(activity, resultCode, extras)
        }
        activityCallback.registerHandler(ecSettingsActivityCallbackId) { resultCode, extras ->
            settingsResult(activity, resultCode, extras)
        }
        activityCallback.registerHandler(ecCardReaderActivityCallbackId) { resultCode, extras ->
            cardReaderResult(activity, resultCode, extras)
        }
    }

    private fun checkResultCode(stage: String, resultCode: Int): Boolean {
        // the activity result code seems to equals the sumup result code
        // and the sumup result codes are custom, hence >= than the first user result code.
        // -1 is default success, 0 is aborted, which we both don't expect.
        if (resultCode < Activity.RESULT_FIRST_USER) {
            _paymentStatus.update { SumUpState.Started("bad $stage intent result: $resultCode") }
            return false
        }

        return true
    }


    private fun nextAction(context: Activity) {
        val deps = sumUpActionDependencies[paymentState.targetAction]
        if (deps == null) {
            Log.e("StuStaPay", "unknown ec action dependencies for ${paymentState.targetAction}")
            return
        }

        var nextAction: SumUpAction = paymentState.targetAction
        if (nextAction in paymentState.actionsDone) {
            return
        }

        for (elem in deps) {
            if (elem !in paymentState.actionsDone) {
                nextAction = elem
                break
            }
        }

        // record the soon-done action.
        paymentState.actionsDone.add(nextAction)

        when (nextAction) {
            SumUpAction.None -> {}
            SumUpAction.Login -> {
                openLogin(context)
            }
            SumUpAction.Checkout -> {
                openCheckout(context)
            }
            SumUpAction.CardReader -> {
                openCardReaderPage(context)
            }
            SumUpAction.Settings -> {
                openSettings(context)
            }
        }
    }


    private fun nextActionIfOk(context: Activity, extras: Bundle?) {
        if (extras == null) {
            _paymentStatus.update { SumUpState.Error("no intent extras") }
            return
        }

        val resultMsg = extras.getString(SumUpAPI.Response.MESSAGE)
        when (val result = SumUpResultCode.fromInt(extras.getInt(SumUpAPI.Response.RESULT_CODE))) {
            SumUpResultCode.SUCCESSFUL -> {
                _paymentStatus.update { SumUpState.Started("done: $resultMsg") }
                nextAction(context)
            }
            else -> {
                _paymentStatus.update { SumUpState.Error("bad sumup result: $result: $resultMsg") }
            }
        }
    }

    private suspend fun setState(target: SumUpAction, payment: ECPayment? = null): Boolean {
        return when (val sumUpConfig = fetchConfig()) {
            is SumUpConfigState.Error -> {
                _paymentStatus.update { SumUpState.Failed("failed fetching sumup configuration: ${sumUpConfig.msg}") }
                false
            }
            is SumUpConfigState.OK -> {
                _paymentStatus.update { SumUpState.None }

                // set up the state machine
                paymentState = PaymentState(
                    targetAction = target,
                    config = sumUpConfig.cfg,
                    payment = payment,
                )
                true
            }
        }
    }


    private suspend fun fetchConfig(): SumUpConfigState {
        val sumUpConfig: SumUpConfig

        // TODO: cache the result :)
        terminalConfigRepository.fetchConfig()

        when (val terminalConfig = terminalConfigRepository.terminalConfigState.value) {
            is TerminalConfigState.Success -> {
                val cfg = terminalConfig.config
                if (cfg.secrets == null) {
                    return SumUpConfigState.Error("no terminal ec secrets in config")
                }
                if (!cfg.secrets.sumup_affiliate_key.startsWith("sup_afk")) {
                    return SumUpConfigState.Error("invalid affiliate key: ${cfg.secrets.sumup_affiliate_key}")
                }
                sumUpConfig = SumUpConfig(
                    affiliateKey = cfg.secrets.sumup_affiliate_key,
                    terminal = ECTerminalConfig(
                        name = cfg.name,
                        id = cfg.id.toString()
                    )
                )
            }
            else -> {
                return SumUpConfigState.Error("failed to fetch terminal ec config")
            }
        }

        return SumUpConfigState.OK(sumUpConfig)
    }

    /**
     * open the sumup login screen.
     */
    suspend fun login(
        context: Activity,
    ) {
        if (setState(target = SumUpAction.Login, payment = null)) {
            nextAction(context)
        }
    }

    /**
     * logout from sumup account.
     */
    suspend fun logout() {
        SumUpAPI.logout()
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
        if (setState(target = SumUpAction.Checkout, payment = payment)) {
            nextAction(context)
        }
    }

    /**
     * initiates a ec payment.
     *
     * first, creates the payment definition,
     * then launches the sumup payment activity.
     */
    suspend fun settings(
        context: Activity
    ) {
        if (setState(target = SumUpAction.Settings, payment = null)) {
            nextAction(context)
        }
    }

    /**
     * opens the card reader settings activity.
     */
    suspend fun cardReaderSettings(
        context: Activity
    ) {
        if (setState(target = SumUpAction.CardReader, payment = null)) {
            nextAction(context)
        }
    }


    /**
     * perform login at sumup api.
     * calls back to loginResult.
     */
    private fun openLogin(context: Activity) {
        // TODO: maybe don't do anything if SumUpAPI.isLoggedIn()

        val cfg = paymentState.config
        if (cfg == null) {
            _paymentStatus.update { SumUpState.Error("no config present in login") }
            return
        }

        // ideally, use a per-terminal api key, which is generated by oauth.
        // for now, we need manual logins...
        val sumupLogin = SumUpLogin.builder(cfg.affiliateKey).build()
        //.accessToken(cfg.accessToken).build()

        SumUpAPI.openLoginActivity(context, sumupLogin, ecLoginActivityCallbackId)
    }

    /**
     * called from MainActivity when SumUp Login Activity returns.
     */
    private fun loginResult(context: Activity, resultCode: Int, extras: Bundle?) {
        if (!checkResultCode("login", resultCode)) {
            _paymentStatus.update { SumUpState.Started("bad login intent result: $resultCode") }
            return
        }
        if (extras == null) {
            _paymentStatus.update { SumUpState.Error("no sumup login result intent extras") }
            return
        }

        val resultMsg = extras.getString(SumUpAPI.Response.MESSAGE)
        when (val result = SumUpResultCode.fromInt(extras.getInt(SumUpAPI.Response.RESULT_CODE))) {
            SumUpResultCode.SUCCESSFUL -> {
                _paymentStatus.update { SumUpState.Started("logged in...") }
                nextAction(context)
            }
            SumUpResultCode.ERROR_ALREADY_LOGGED_IN -> {
                nextAction(context)
            }
            SumUpResultCode.ERROR_INVALID_TOKEN -> {
                _paymentStatus.update { SumUpState.Error("sumup login token invalid: $resultMsg") }
            }
            else -> {
                _paymentStatus.update { SumUpState.Error("sumup login result: $result: $resultMsg") }
            }
        }
    }

    /**
     * create a payment.
     * will call back to paymentResult.
     */
    private fun openCheckout(context: Activity) {
        if (!SumUpAPI.isLoggedIn()) {
            _paymentStatus.update { SumUpState.Error("not logged in when checking out") }
            return
        }

        val payment = paymentState.payment
        if (payment == null) {
            _paymentStatus.update { SumUpState.Error("no payment status") }
            return
        }

        val cfg = paymentState.config
        if (cfg == null) {
            _paymentStatus.update { SumUpState.Error("no payment status") }
            return
        }

        // wake up pin device
        SumUpAPI.prepareForCheckout()

        val sumUpPayment = SumUpPayment.builder()
            // minimum 1.00
            .total(payment.amount)
            .currency(SumUpPayment.Currency.EUR)
            // optional: include a tip amount in addition to the total
            .tip(payment.tip)
            .title("StuStaCulum")
            //.receiptEmail("dummy@sft.lol")
            //.receiptSMS("+00000000000")
            .addAdditionalInfo("Terminal", cfg.terminal.name)
            .addAdditionalInfo("TerminalID", cfg.terminal.id)
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

    private fun paymentResult(context: Activity, resultCode: Int, extras: Bundle?) {
        if (!checkResultCode("payment", resultCode)) {
            _paymentStatus.update { SumUpState.Failed("bad payment result: $resultCode") }
            return
        }

        if (extras == null) {
            _paymentStatus.update { SumUpState.Error("no sumup payment result intent extras") }
            return
        }

        val resultMsg = extras.getString(SumUpAPI.Response.MESSAGE)
        when (val result = SumUpResultCode.fromInt(extras.getInt(SumUpAPI.Response.RESULT_CODE))) {
            SumUpResultCode.SUCCESSFUL -> {
                val resultString = extras.getString(SumUpAPI.Response.MESSAGE)
                val txCode = extras.getString(SumUpAPI.Response.TX_CODE)
                // val receiptSent = extras.getBoolean(SumUpAPI.Response.RECEIPT_SENT)

                // TODO: when we have apilevel 33:
                // val txInfo = extras.getParcelable(SumUpAPI.Response.TX_INFO, TransactionInfo::class.java)
                @Suppress("DEPRECATION")
                val txInfo = extras.getParcelable<TransactionInfo>(SumUpAPI.Response.TX_INFO)
                _paymentStatus.update {
                    SumUpState.Success(
                        msg = resultString ?: "no info",
                        txCode = txCode ?: "no transaction code",
                        txInfo = txInfo,
                    )
                }

                // TODO log the payment locally on the terminal,
                //      and maybe sync it back to the core

                nextAction(context)
            }
            else -> {
                _paymentStatus.update {
                    SumUpState.Error("checkout result: $result: $resultMsg")
                }
            }
        }
    }

    /**
     * open the sumup settings.
     * calls back to settingsresult.
     */
    private fun openSettings(context: Activity) {
        // settings for sumup, e.g. pairing with the card terminal
        @Suppress("DEPRECATION")
        SumUpAPI.openPaymentSettingsActivity(context, ecSettingsActivityCallbackId)
    }

    private fun settingsResult(context: Activity, resultCode: Int, extras: Bundle?) {
        if (!checkResultCode("settings", resultCode)) {
            return
        }

        nextActionIfOk(context, extras)
    }


    /**
     * open the sumup cardreader settings.
     * calls back to cardReaderResult.
     */
    private fun openCardReaderPage(context: Activity) {
        // settings for sumup, e.g. pairing with the card terminal
        SumUpAPI.openCardReaderPage(context, ecCardReaderActivityCallbackId)
    }


    private fun cardReaderResult(context: Activity, resultCode: Int, extras: Bundle?) {
        if (!checkResultCode("card reader", resultCode)) {
            return
        }

        nextActionIfOk(context, extras)
    }
}