package de.stustapay.stustapay.ui.debug


import android.app.Activity
import androidx.lifecycle.ViewModel
import com.ionspin.kotlin.bignum.integer.toBigInteger
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.ec.SumUp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import java.util.UUID
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

    suspend fun tokenLogin(context: Activity) {
        _status.update { "performing token login..." }
        sumUp.tokenLogin(context)
    }

    suspend fun logout(context: Activity) {
        _status.update { "logging out..." }
        sumUp.logout()
    }

    suspend fun openSettingsDeprecated(context: Activity) {
        _status.update { "opening deprecated settings..." }
        sumUp.settingsOld(context)
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
                tag = NfcTag(0.toBigInteger(), null),
                amount = BigDecimal(100),
            )
        )
    }
}