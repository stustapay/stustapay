package de.stustanet.stustapay.model

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class UserPreferencesViewModel(private val context: Context) {
    companion object {
        private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("userEndpoint")
        private val USER_ENDPOINT_KEY = stringPreferencesKey("user_endpoint")
    }

    val getEndpoint: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[USER_ENDPOINT_KEY] ?: "stustapay.de"
    }

    suspend fun updateEndpoint(endpoint: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_ENDPOINT_KEY] = endpoint
        }
    }
}