package de.stustanet.stustapay.ui.debug


import android.app.Activity
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.ec.SumUp
import de.stustanet.stustapay.model.UserTag
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import java.util.*
import javax.inject.Inject

@HiltViewModel
class ECDebugViewModel @Inject constructor(
    private val sumUp: SumUp,
) : ViewModel() {
    private val _status = MutableStateFlow("loading...")
    val status = _status.asStateFlow()
    val sumUpState = sumUp.paymentStatus

    suspend fun openLogin(context: Activity) {
        _status.update { "opening login..." }
        sumUp.login(context)
    }

    suspend fun openSettings(context: Activity) {
        _status.update { "opening settings..." }
        sumUp.settings(context)
    }

    suspend fun openCardReader(context: Activity) {
        _status.update { "opening card reader settings..." }
        sumUp.cardReaderSettings(context)
    }

    suspend fun openCheckout(context: Activity) {
        _status.update { "opening checkout..." }
        sumUp.pay(
            context = context,
            payment = ECPayment(
                id = "test ${UUID.randomUUID()}",
                tag = UserTag(0u),
                amount = BigDecimal(100),
            )
        )
    }
}