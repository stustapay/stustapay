package de.stustanet.stustapay.ui.ec

import android.app.Activity
import android.content.Context
import java.math.BigDecimal
import androidx.lifecycle.ViewModel
import com.sumup.merchant.reader.api.SumUpAPI
import com.sumup.merchant.reader.api.SumUpLogin
import com.sumup.merchant.reader.api.SumUpPayment
import com.sumup.merchant.reader.api.SumUpState
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.R
import java.util.*
import javax.inject.Inject

@HiltViewModel
class SumUpViewModel @Inject constructor(
) : ViewModel() {


    fun pay(context: Activity, total: BigDecimal, tip: BigDecimal = BigDecimal(0)) {
        SumUpAPI.prepareForCheckout()

        if (!SumUpAPI.isLoggedIn()) {
            val sumupLogin = SumUpLogin.builder(context.getString(R.string.sumup_affiliate_key)).build()
            SumUpAPI.openLoginActivity(context, sumupLogin, 1) // todo use intent request code
        }

        val payment = SumUpPayment.builder() // mandatory parameters
            .total(total) // minimum 1.00
            .currency(SumUpPayment.Currency.EUR) // optional: include a tip amount in addition to the total
            .tip(tip) // optional: add details
            .title("Stustapay Test")
            .receiptEmail("nic@sft.olol")
            .receiptSMS("+17632316378") // optional: Add metadata
            .addAdditionalInfo("AccountId", "bier6969")
            .addAdditionalInfo("From", "Munich")
            .foreignTransactionId(
                UUID.randomUUID().toString()
            ) // stustapay-id!
            .build()


        // TODO: use more modern registerForActivityResult
        SumUpAPI.checkout(context, payment, 50309)
    }
}
