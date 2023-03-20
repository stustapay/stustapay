package de.stustanet.stustapay.ec

import android.app.Activity
import android.content.Context
import android.os.Bundle
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.sumup.merchant.reader.api.SumUpAPI
import com.sumup.merchant.reader.api.SumUpLogin
import com.sumup.merchant.reader.api.SumUpPayment
import com.sumup.merchant.reader.api.SumUpState
import com.sumup.merchant.reader.models.TransactionInfo
import de.stustanet.stustapay.R
import java.math.BigDecimal
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SumUpHandler @Inject constructor(private var intentRequestCode: Int) {

    fun init(context: Context){
        SumUpState.init(context)
    }

    @Composable
    fun pay(total: BigDecimal, tip: BigDecimal = BigDecimal(0)) {
        val activity = LocalContext.current as Activity?
        SumUpAPI.prepareForCheckout()

        if (!SumUpAPI.isLoggedIn()) {
            val sumupLogin = SumUpLogin.builder(R.string.sumup_affiliate_key.toString()).build()
            SumUpAPI.openLoginActivity(activity, sumupLogin, 1) // todo use intent request code
        }
        // after successful login

        val payment = SumUpPayment.builder() // mandatory parameters
            .total(total) // minimum 1.00
            .currency(SumUpPayment.Currency.EUR) // optional: include a tip amount in addition to the total
            .tip(BigDecimal(0)) // optional: add details
            .title("StuSta e.V.")
            .receiptEmail("info@merkel.de")
            .receiptSMS("+555NASE") // optional: Add metadata
            .foreignTransactionId(
                UUID.randomUUID().toString()
            ) // stustapay-id! can not exceed 128 chars
            // optional: skip the success screen
            .skipSuccessScreen() // optional: skip the failed screen
            .skipFailedScreen()
            .build()


        // TODO: use more modern registerForActivityResult
        SumUpAPI.checkout(activity, payment, intentRequestCode)
    }

//    fun settings() {
//        // open reader settings
//        SumUpAPI.openCardReaderPage(activity, 4);
//    }

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
                // error
            }
            val resultString = extras.getString(SumUpAPI.Response.MESSAGE)
            val txCode = extras.getString(SumUpAPI.Response.TX_CODE)
            val receiptSent = extras.getBoolean(SumUpAPI.Response.RECEIPT_SENT)
            val txInfo = extras.getParcelable<TransactionInfo>(SumUpAPI.Response.TX_INFO)
            // api 33: val txInfo = extras.getParcelable(SumUpAPI.Response.TX_INFO, TransactionInfo::class.java)
        }
    }
}