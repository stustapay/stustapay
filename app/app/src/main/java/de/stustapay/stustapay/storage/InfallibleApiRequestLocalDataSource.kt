package de.stustapay.stustapay.storage

import androidx.datastore.core.DataStore
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiRequests
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InfallibleApiRequestLocalDataSource @Inject constructor(
    private val infallibleApiRequestStore: DataStore<InfallibleApiRequests>
) {
    suspend fun push(id: UUID, request: InfallibleApiRequest) {
        infallibleApiRequestStore.updateData {
            InfallibleApiRequests(
                requests = it.requests + Pair(id, request)
            )
        }
    }

    val requests: Flow<Map<UUID, InfallibleApiRequest>> =
        infallibleApiRequestStore.data.map { it.requests }

    suspend fun remove(id: UUID) {
        infallibleApiRequestStore.updateData {
            InfallibleApiRequests(requests = it.requests.filter { it.key != id })
        }
    }

    suspend fun clear() {
        infallibleApiRequestStore.updateData {
            InfallibleApiRequests(mapOf())
        }
    }
}