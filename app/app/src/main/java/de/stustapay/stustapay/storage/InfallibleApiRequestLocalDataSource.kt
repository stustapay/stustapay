package de.stustapay.stustapay.storage

import androidx.datastore.core.DataStore
import de.stustapay.stustapay.model.InfallibleApiRequest
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InfallibleApiRequestLocalDataSource @Inject constructor(
    private val infallibleApiRequestStore: DataStore<InfallibleApiRequest?>
) {
    val request: Flow<InfallibleApiRequest?> =
        infallibleApiRequestStore.data

    suspend fun update(request: InfallibleApiRequest) {
        infallibleApiRequestStore.updateData {
            request
        }
    }

    suspend fun clear() {
        infallibleApiRequestStore.updateData { null }
    }
}