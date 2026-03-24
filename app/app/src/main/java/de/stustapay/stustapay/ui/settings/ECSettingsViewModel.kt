package de.stustapay.stustapay.ui.settings


import android.app.Activity
import android.content.Context
import androidx.lifecycle.ViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ec.SumUp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class ECSettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val sumUp: SumUp,
) : ViewModel() {
    private val _status = MutableStateFlow(context.getString(R.string.common_status_idle))
    val status = _status.asStateFlow()
    val sumUpState = sumUp.paymentStatus
    val sumUpLogin = sumUp.loginStatus

    suspend fun openLogin(context: Activity) {
        _status.update { this.context.getString(R.string.ec_debug_status_opening_login) }
        sumUp.login(context)
    }

    suspend fun performTokenLogin(context: Activity) {
        _status.update { this.context.getString(R.string.ec_settings_status_logging_in_with_token) }
        sumUp.tokenLogin(context)
    }

    suspend fun logout() {
        _status.update { context.getString(R.string.ec_debug_status_logging_out) }
        sumUp.logout()
    }

    suspend fun openOldSettings(context: Activity) {
        _status.update { this.context.getString(R.string.ec_settings_status_opening_old_settings_menu) }
        sumUp.settingsOld(context)
    }

    suspend fun openCardReader(context: Activity) {
        _status.update {
            if (!sumUp.isLoggedIn()) {
                this.context.getString(R.string.ec_settings_status_opening_card_reader_not_logged_in)
            } else {
                this.context.getString(R.string.ec_settings_status_opening_card_reader)
            }
        }
        sumUp.cardReaderSettings(context)
    }
}