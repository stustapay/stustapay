package de.stustapay.stustapay.device

import android.content.Context
import android.util.Log
import com.hmdm.HeadwindMDM
import dagger.hilt.android.qualifiers.ApplicationContext
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import de.stustapay.stustapay.repository.TerminalConfigRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.firstOrNull
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

            val currentState = registrationRepositoryInner.registrationState.firstOrNull()
            if (currentState is RegistrationState.Registered &&
                currentState.token == managedConfig.token &&
                currentState.apiUrl == managedConfig.baseUrl
            ) {
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
                ),
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
            val terminalName = headwindMDM.getCustom(3)?.takeIf { it.isNotBlank() }

            Log.d(TAG, "HeadwindMDM custom values: custom1=${token?.take(8)}…, custom2=$baseUrl, custom3=$terminalName")

            if (token.isNullOrBlank() || baseUrl.isNullOrBlank()) {
                Log.d(
                    TAG,
                    "HeadwindMDM returned empty token/baseUrl (token=${token != null}, baseUrl=${baseUrl != null})",
                )
                null
            } else {
                HeadwindManagedConfig(
                    token = token,
                    baseUrl = baseUrl,
                    terminalId = null,
                    terminalName = terminalName,
                    terminalDescription = null,
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Unable to load Headwind MDM managed config via HeadwindMDM", e)
            null
        }
    }

    private data class HeadwindManagedConfig(
        val token: String,
        val baseUrl: String,
        val terminalId: Int?,
        val terminalName: String?,
        val terminalDescription: String?,
    )

    companion object {
        private const val TAG = "ManagedConfigWatcher"
    }
}

