package de.stustapay.stustapay.device

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSuggestion
import android.os.Build
import androidx.annotation.RequiresApi
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@RequiresApi(Build.VERSION_CODES.Q)
fun buildWifiNetworkSuggestion(config: ManagedWifiConfig): WifiNetworkSuggestion {
    val builder = WifiNetworkSuggestion.Builder()
        .setSsid(config.ssid)
        .setWpa2Passphrase(config.passphrase)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        builder.setCredentialSharedWithUser(true)
    }

    return builder.build()
}

@Singleton
class AndroidWifiSuggestionClient @Inject constructor(
    @ApplicationContext context: Context,
) : WifiSuggestionClient {
    private val wifiManager = context.applicationContext.getSystemService(WifiManager::class.java)

    @SuppressLint("MissingPermission")
    override suspend fun addSuggestion(config: ManagedWifiConfig): WifiSuggestionResult {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return WifiSuggestionResult.Failure("Wi-Fi suggestions require Android 10 or newer.")
        }

        val status = wifiManager.addNetworkSuggestions(listOf(buildWifiNetworkSuggestion(config)))
        return when (status) {
            WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS,
            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_DUPLICATE,
            -> WifiSuggestionResult.Success

            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_APP_DISALLOWED -> {
                WifiSuggestionResult.Failure("This device does not allow Wi-Fi suggestions from the app.")
            }

            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_INTERNAL -> {
                WifiSuggestionResult.Failure("The system rejected the Wi-Fi suggestion due to an internal error.")
            }

            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_EXCEEDS_MAX_PER_APP -> {
                WifiSuggestionResult.Failure("Too many Wi-Fi suggestions are already registered for this app.")
            }

            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_INVALID -> {
                WifiSuggestionResult.Failure("The Wi-Fi suggestion payload is invalid.")
            }

            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_NOT_ALLOWED -> {
                WifiSuggestionResult.Failure("The device policy does not allow adding this Wi-Fi suggestion.")
            }

            else -> {
                WifiSuggestionResult.Failure("The Wi-Fi suggestion failed with status code $status.")
            }
        }
    }

    @SuppressLint("MissingPermission")
    override suspend fun removeSuggestion(config: ManagedWifiConfig): WifiSuggestionResult {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return WifiSuggestionResult.Success
        }

        wifiManager.removeNetworkSuggestions(listOf(buildWifiNetworkSuggestion(config)))
        return WifiSuggestionResult.Success
    }
}
