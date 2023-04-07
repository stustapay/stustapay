package de.stustanet.stustapay.repository

import android.app.Activity
import android.os.Bundle
import com.sumup.merchant.reader.api.SumUpAPI
import com.sumup.merchant.reader.api.SumUpLogin
import com.sumup.merchant.reader.api.SumUpPayment
import com.sumup.merchant.reader.models.TransactionInfo
import de.stustanet.stustapay.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.math.BigDecimal
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton
import com.sumup.merchant.reader.api.SumUpState as SumUpReaderState

sealed interface SumUpState {

    object None : SumUpState

    data class Started(
        val transactionId: String
    ) : SumUpState

    data class Failed(
        val msg: String
    ) : SumUpState

    data class Success(
        val transactionId: String
    ) : SumUpState
}

val ecPaymentActivityCallbackId = 50309

@Singleton
class SumUpRepository @Inject constructor() {
    private val _paymentStatus = MutableStateFlow<SumUpState>(SumUpState.None)
    val paymentStatus = _paymentStatus.asStateFlow()

    fun init(context : Activity){
        SumUpReaderState.init(context)
    }

    suspend fun pay(context: Activity, total: BigDecimal, tip: BigDecimal = BigDecimal(0)) {
        SumUpAPI.prepareForCheckout()

        if (!SumUpAPI.isLoggedIn()) {
            val sumupLogin =
                SumUpLogin.builder(context.getString(R.string.sumup_affiliate_key)).build()
            SumUpAPI.openLoginActivity(context, sumupLogin, 1) // todo use intent request code
        }

        val transactionId = UUID.randomUUID().toString()

        val payment = SumUpPayment.builder() // mandatory parameters
            .total(total) // minimum 1.00
            .currency(SumUpPayment.Currency.EUR) // optional: include a tip amount in addition to the total
            .tip(tip) // optional: add details
            .title("Stustapay Test")
            .receiptEmail("nic@sft.olol")
            .receiptSMS("+17632316378") // optional: Add metadata
            .addAdditionalInfo("AccountId", "bier6969")
            .addAdditionalInfo("From", "Munich")
            .foreignTransactionId(transactionId) // stustapay-id!
            .build()

        _paymentStatus.emit(SumUpState.Started(transactionId))

        // TODO: use more modern registerForActivityResult
        SumUpAPI.checkout(context, payment, ecPaymentActivityCallbackId)
    }

    fun paymentResult(resultCode: Int, extras: Bundle?) {
        // Handle the response here
        if (resultCode == Activity.RESULT_OK) {
            // There are no request codes
            // doSomeOperations()
            if (extras == null) {
                error("no sumup intent extras")
            }

            val resultCode = extras.getInt(SumUpAPI.Response.RESULT_CODE)
            if (resultCode != SumUpAPI.Response.ResultCode.SUCCESSFUL) {
                _paymentStatus.tryEmit(SumUpState.Failed("FAILED"))
            } else {
                val resultString = extras.getString(SumUpAPI.Response.MESSAGE)
                val txCode = extras.getString(SumUpAPI.Response.TX_CODE)
                val receiptSent = extras.getBoolean(SumUpAPI.Response.RECEIPT_SENT)
                val txInfo = extras.getParcelable<TransactionInfo>(SumUpAPI.Response.TX_INFO)
                _paymentStatus.tryEmit(SumUpState.Success("LOLYES"))
            }

            // api 33: val txInfo = extras.getParcelable(SumUpAPI.Response.TX_INFO, TransactionInfo::class.java)
        }
        else{
            //TODO: This seems to not actually emit anything
            _paymentStatus.tryEmit(SumUpState.Failed("FAILED"))
        }
    }

    suspend fun registerResult(resultState : SumUpState){
        _paymentStatus.emit(resultState)
    }

}