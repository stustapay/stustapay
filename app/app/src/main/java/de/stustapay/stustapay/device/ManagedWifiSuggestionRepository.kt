package de.stustapay.stustapay.device

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class ManagedWifiSuggestionState(
    val desiredConfig: ManagedWifiConfig? = null,
    val appliedConfig: ManagedWifiConfig? = null,
    val lastErrorMessage: String? = null,
)

sealed interface WifiSuggestionResult {
    data object Success : WifiSuggestionResult
    data class Failure(val message: String) : WifiSuggestionResult
}

interface WifiSuggestionClient {
    suspend fun addSuggestion(config: ManagedWifiConfig): WifiSuggestionResult
    suspend fun removeSuggestion(config: ManagedWifiConfig): WifiSuggestionResult
}

interface ManagedWifiSuggestionStateStore {
    val state: StateFlow<ManagedWifiSuggestionState>
    fun updateState(state: ManagedWifiSuggestionState)
}

@Singleton
class SharedPrefsManagedWifiSuggestionStateStore @Inject constructor(
    @ApplicationContext context: Context,
) : ManagedWifiSuggestionStateStore {
    private val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val mutableState = MutableStateFlow(loadState())

    override val state: StateFlow<ManagedWifiSuggestionState> = mutableState.asStateFlow()

    override fun updateState(state: ManagedWifiSuggestionState) {
        preferences.edit()
            .putString(KEY_DESIRED_SSID, state.desiredConfig?.ssid)
            .putString(KEY_DESIRED_PASSPHRASE, state.desiredConfig?.passphrase)
            .putString(KEY_APPLIED_SSID, state.appliedConfig?.ssid)
            .putString(KEY_APPLIED_PASSPHRASE, state.appliedConfig?.passphrase)
            .putString(KEY_LAST_ERROR, state.lastErrorMessage)
            .apply()
        mutableState.value = state
    }

    private fun loadState(): ManagedWifiSuggestionState {
        return ManagedWifiSuggestionState(
            desiredConfig = loadConfig(KEY_DESIRED_SSID, KEY_DESIRED_PASSPHRASE),
            appliedConfig = loadConfig(KEY_APPLIED_SSID, KEY_APPLIED_PASSPHRASE),
            lastErrorMessage = preferences.getString(KEY_LAST_ERROR, null),
        )
    }

    private fun loadConfig(ssidKey: String, passphraseKey: String): ManagedWifiConfig? {
        val ssid = preferences.getString(ssidKey, null)
        val passphrase = preferences.getString(passphraseKey, null)
        if (ssid.isNullOrBlank() || passphrase.isNullOrBlank()) {
            return null
        }
        return ManagedWifiConfig(ssid = ssid, passphrase = passphrase)
    }

    private companion object {
        private const val PREFS_NAME = "managed_wifi_suggestion"
        private const val KEY_DESIRED_SSID = "desired_ssid"
        private const val KEY_DESIRED_PASSPHRASE = "desired_passphrase"
        private const val KEY_APPLIED_SSID = "applied_ssid"
        private const val KEY_APPLIED_PASSPHRASE = "applied_passphrase"
        private const val KEY_LAST_ERROR = "last_error"
    }
}

@Singleton
class ManagedWifiSuggestionRepository @Inject constructor(
    private val wifiSuggestionClient: WifiSuggestionClient,
    private val stateStore: ManagedWifiSuggestionStateStore,
) {
    val state: StateFlow<ManagedWifiSuggestionState> = stateStore.state

    suspend fun syncManagedConfig(config: ManagedWifiConfig?) {
        val currentState = stateStore.state.value

        if (config == null) {
            clearManagedConfig(currentState)
            return
        }

        if (currentState.desiredConfig == config) {
            return
        }

        applyConfig(
            desiredConfig = config,
            currentState = currentState,
            force = false,
        )
    }

    suspend fun retrySuggestion() {
        val currentState = stateStore.state.value
        val desiredConfig = currentState.desiredConfig ?: return

        applyConfig(
            desiredConfig = desiredConfig,
            currentState = currentState,
            force = true,
        )
    }

    private suspend fun clearManagedConfig(currentState: ManagedWifiSuggestionState) {
        currentState.appliedConfig?.let {
            wifiSuggestionClient.removeSuggestion(it)
        }
        stateStore.updateState(ManagedWifiSuggestionState())
    }

    private suspend fun applyConfig(
        desiredConfig: ManagedWifiConfig,
        currentState: ManagedWifiSuggestionState,
        force: Boolean,
    ) {
        val appliedConfig = currentState.appliedConfig
        if (appliedConfig != null && (force || appliedConfig != desiredConfig)) {
            wifiSuggestionClient.removeSuggestion(appliedConfig)
        }

        when (val result = wifiSuggestionClient.addSuggestion(desiredConfig)) {
            WifiSuggestionResult.Success -> {
                stateStore.updateState(
                    ManagedWifiSuggestionState(
                        desiredConfig = desiredConfig,
                        appliedConfig = desiredConfig,
                        lastErrorMessage = null,
                    )
                )
            }

            is WifiSuggestionResult.Failure -> {
                stateStore.updateState(
                    ManagedWifiSuggestionState(
                        desiredConfig = desiredConfig,
                        appliedConfig = null,
                        lastErrorMessage = result.message,
                    )
                )
            }
        }
    }
}
