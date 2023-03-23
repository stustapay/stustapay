package de.stustanet.stustapay.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import de.stustanet.stustapay.model.RegistrationState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class RegistrationLocalDataSource @Inject constructor(
    @ApplicationContext val context: Context,
    val regStateStore: DataStore<RegistrationState>
) {

    companion object {
        private val Context.loginStore: DataStore<Preferences> by preferencesDataStore("login")
        private val API_ENDPOINT = stringPreferencesKey("api_endpoint")
        private val AUTH_TOKEN = stringPreferencesKey("auth_token")
    }

    val registrationState: Flow<RegistrationState> = context.loginStore.data.map { pref ->
        pref[AUTH_TOKEN]?.let { token ->
            pref[API_ENDPOINT]?.let { endpoint ->
                RegistrationState.Registered(token = token, apiUrl = endpoint, "in local storage")
            }
        } ?:
        RegistrationState.Error(
            message = "not in local storage"
        )
    }

    suspend fun setState(registrationState: RegistrationState.Registered) {
        context.loginStore.edit { pref ->
            pref[AUTH_TOKEN] = registrationState.token
            pref[API_ENDPOINT] = registrationState.apiUrl
        }
    }
}