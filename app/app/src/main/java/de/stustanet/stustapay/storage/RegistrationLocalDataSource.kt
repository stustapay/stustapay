package de.stustanet.stustapay.storage

import androidx.datastore.core.DataStore
import de.stustanet.stustapay.model.RegistrationState
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class RegistrationLocalDataSource @Inject constructor(
    private val regStateStore: DataStore<RegistrationState>
) {
    val registrationState: Flow<RegistrationState> = regStateStore.data

    suspend fun setState(registrationState: RegistrationState.Registered) {
        regStateStore.updateData { registrationState }
    }
}