package de.stustapay.stustapay.ui.settings


import android.app.Activity
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.ec.SumUp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class ECSettingsViewModel @Inject constructor(
    private val sumUp: SumUp,
) : ViewModel() {
    private val _status = MutableStateFlow("loading...")
    val status = _status.asStateFlow()
    val sumUpState = sumUp.paymentStatus

    suspend fun openLogin(context: Activity) {
        _status.update { "opening login..." }
        sumUp.login(context)
    }

    suspend fun logout() {
        _status.update { "logging out..." }
        sumUp.logout()
    }

    suspend fun openSettings(context: Activity) {
        _status.update { "opening settings..." }
        sumUp.settings(context)
    }

    suspend fun openCardReader(context: Activity) {
        _status.update { "opening card reader settings..." }
        sumUp.cardReaderSettings(context)
    }
}