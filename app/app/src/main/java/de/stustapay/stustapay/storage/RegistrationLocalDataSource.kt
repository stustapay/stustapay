package de.stustapay.stustapay.storage

import androidx.datastore.core.DataStore
import de.stustapay.stustapay.model.RegistrationState
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RegistrationLocalDataSource @Inject constructor(
    private val regStateStore: DataStore<RegistrationState>
) {
    val registrationState: Flow<RegistrationState> = regStateStore.data

    suspend fun setState(registrationState: RegistrationState.Registered) {
        regStateStore.updateData { registrationState }
    }

    suspend fun delete() {
        regStateStore.updateData {
            // TODO: can't we just clear the datastore??
            RegistrationState.NotRegistered("deregistered")
        }
    }
}