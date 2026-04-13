package de.stustapay.stustapay.device

import android.content.Context
import android.util.Log
import com.hmdm.HeadwindMDM
import dagger.hilt.android.qualifiers.ApplicationContext
import de.stustapay.stustapay.model.asManagedRegistration
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.model.isManagedConfigDisabled
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import de.stustapay.stustapay.repository.TerminalConfigRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

object ManagedConfigKeys {
    const val TERMINAL_TOKEN = "MDM_TERMINAL_TOKEN"
    const val TERMINAL_ID = "MDM_TERMINAL_ID"
    const val TERMINAL_NAME = "MDM_TERMINAL_NAME"
    const val TERMINAL_DESCRIPTION = "MDM_TERMINAL_DESCRIPTION"
    const val TERMINAL_BASE_URL = "MDM_TERMINAL_BASE_URL"
}

@Singleton
class ManagedConfigWatcher @Inject constructor(
    @ApplicationContext private val context: Context,
    private val registrationRepositoryInner: RegistrationRepositoryInner,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val managedWifiSuggestionRepository: ManagedWifiSuggestionRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val headwindMDM: HeadwindMDM = HeadwindMDM.getInstance()

    private val eventHandler = object : HeadwindMDM.EventHandler {
        override fun onHeadwindMDMConnected() {
            Log.i(TAG, "HeadwindMDM connected, refreshing managed configuration")
            refreshManagedConfig()
        }

        override fun onHeadwindMDMDisconnected() {
            Log.i(TAG, "HeadwindMDM disconnected")
        }

        override fun onHeadwindMDMConfigChanged() {
            Log.i(TAG, "HeadwindMDM config changed")
            refreshManagedConfig()
        }
    }

    fun start() {
        // Establish connection to Headwind MDM agent. Callbacks will drive config refresh.
        scope.launch {
            val ok = headwindMDM.connect(context, eventHandler)
            if (ok && headwindMDM.isConnected) {
                refreshManagedConfig()
            }
        }
    }

    fun stop() {
        headwindMDM.disconnect(context)
        scope.cancel()
    }

    fun refreshNow() {
        refreshManagedConfig()
    }

    private fun refreshManagedConfig() {
        scope.launch {
            if (!headwindMDM.isConnected) {
                Log.d(TAG, "HeadwindMDM not connected yet, skipping managed config refresh")
                return@launch
            }

            val managedConfig = readHeadwindManagedConfig()
            if (managedConfig == null) {
                Log.w(TAG, "Headwind managed config not available yet")
                return@launch
            }

            managedWifiSuggestionRepository.syncManagedConfig(managedConfig.wifiConfig)

            if (managedConfig.token.isNullOrBlank() || managedConfig.baseUrl.isNullOrBlank()) {
                Log.d(
                    TAG,
                    "HeadwindMDM returned empty token/baseUrl (token=${managedConfig.token != null}, baseUrl=${managedConfig.baseUrl != null})",
                )
                return@launch
            }

            val currentState = registrationRepositoryInner.currentStoredState()
            if (!shouldApplyManagedRegistration(currentState, managedConfig.token, managedConfig.baseUrl)) {
                if (currentState?.isManagedConfigDisabled() == true) {
                    Log.i(TAG, "Skipping Headwind managed registration because manual override is active")
                }
                return@launch
            }

            Log.i(
                TAG,
                "Applying Headwind managed registration for ${managedConfig.baseUrl} (terminal=${managedConfig.terminalName ?: "n/a"})",
            )
            registrationRepositoryInner.storeState(
                RegistrationState.Registered(
                    token = managedConfig.token,
                    apiUrl = managedConfig.baseUrl,
                    message = "Headwind managed configuration",
                ).asManagedRegistration(message = "Headwind managed configuration"),
            )
            terminalConfigRepository.fetchConfig(keepTrying = false)
        }
    }

    private fun readHeadwindManagedConfig(): HeadwindManagedConfig? {
        return try {
            // Custom1 / Custom2 / Custom3 are exposed via getCustom(index) in the SDK.
            // By convention in Headwind docs, CUSTOM1 is index 1, CUSTOM2 index 2, etc.
            val token = headwindMDM.getCustom(1)?.takeIf { it.isNotBlank() }
            val baseUrl = headwindMDM.getCustom(2)?.takeIf { it.isNotBlank() }
            val custom3 = headwindMDM.getCustom(3)?.takeIf { it.isNotBlank() }
            val custom3Payload = parseHeadwindCustom3(custom3)

            Log.d(
                TAG,
                "HeadwindMDM custom values: custom1=${token?.take(8)}…, custom2=$baseUrl, terminal=${custom3Payload.terminalName}, wifi=${custom3Payload.wifiConfig != null}",
            )

            HeadwindManagedConfig(
                token = token,
                baseUrl = baseUrl,
                terminalId = null,
                terminalName = custom3Payload.terminalName,
                terminalDescription = null,
                wifiConfig = custom3Payload.wifiConfig,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Unable to load Headwind MDM managed config via HeadwindMDM", e)
            null
        }
    }

    private data class HeadwindManagedConfig(
        val token: String?,
        val baseUrl: String?,
        val terminalId: Int?,
        val terminalName: String?,
        val terminalDescription: String?,
        val wifiConfig: ManagedWifiConfig?,
    )

    companion object {
        private const val TAG = "ManagedConfigWatcher"
    }
}

internal fun shouldApplyManagedRegistration(
    currentState: RegistrationState?,
    managedToken: String,
    managedBaseUrl: String,
): Boolean {
    if (currentState?.isManagedConfigDisabled() == true) {
        return false
    }

    return when (currentState) {
        is RegistrationState.Registered -> {
            currentState.token != managedToken || currentState.apiUrl != managedBaseUrl
        }
        else -> true
    }
}
