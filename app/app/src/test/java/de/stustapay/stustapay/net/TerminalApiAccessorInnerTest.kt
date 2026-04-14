package de.stustapay.stustapay.net

import de.stustapay.stustapay.model.RegistrationState
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.cio.CIO
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Collections

class TerminalApiAccessorInnerTest {
    @Test
    fun `reset publishes replacement apis before retiring previous engine`() = runBlocking {
        val closedEngineIds = Collections.synchronizedList(mutableListOf<Int>())
        val registrationState = MutableStateFlow<RegistrationState>(
            registeredState(token = "token-1", apiUrl = "https://core-1.example"),
        )
        val accessor = createAccessor(registrationState, closedEngineIds)

        try {
            val initialSnapshot = waitForSnapshot(accessor)
            val initialBaseApi = accessor.base()

            accessor.resetClient()

            val resetSnapshot = waitForSnapshot(accessor) { it.engineId != initialSnapshot.engineId }

            assertNotEquals(initialSnapshot.engineId, resetSnapshot.engineId)
            assertNotSame(initialBaseApi, accessor.base())
            assertFalse(closedEngineIds.contains(initialSnapshot.engineId))

            delay(TEST_ENGINE_RETIREMENT_DELAY_MILLIS * 2)

            assertTrue(closedEngineIds.contains(initialSnapshot.engineId))
        } finally {
            accessor.close()
        }
    }

    @Test
    fun `registration changes rebuild the published snapshot`() = runBlocking {
        val closedEngineIds = Collections.synchronizedList(mutableListOf<Int>())
        val registrationState = MutableStateFlow<RegistrationState>(
            registeredState(token = "token-1", apiUrl = "https://core-1.example"),
        )
        val accessor = createAccessor(registrationState, closedEngineIds)

        try {
            val initialSnapshot = waitForSnapshot(accessor)
            val initialUserApi = accessor.user()
            val updatedState = registeredState(token = "token-2", apiUrl = "https://core-2.example")

            registrationState.value = updatedState

            val updatedSnapshot = waitForSnapshot(accessor) {
                it.engineId != initialSnapshot.engineId && it.registrationState == updatedState
            }

            assertEquals(updatedState, updatedSnapshot.registrationState)
            assertNotSame(initialUserApi, accessor.user())

            delay(TEST_ENGINE_RETIREMENT_DELAY_MILLIS * 2)

            assertTrue(closedEngineIds.contains(initialSnapshot.engineId))
        } finally {
            accessor.close()
        }
    }

    @Test
    fun `repeated resets keep a single active snapshot`() = runBlocking {
        val closedEngineIds = Collections.synchronizedList(mutableListOf<Int>())
        val registrationState = MutableStateFlow<RegistrationState>(
            registeredState(token = "token-1", apiUrl = "https://core-1.example"),
        )
        val accessor = createAccessor(registrationState, closedEngineIds)

        try {
            var previousSnapshot = waitForSnapshot(accessor)
            val retiredEngineIds = mutableSetOf<Int>()

            repeat(3) {
                accessor.resetClient()
                val nextSnapshot = waitForSnapshot(accessor) { it.engineId != previousSnapshot.engineId }
                retiredEngineIds += previousSnapshot.engineId
                previousSnapshot = nextSnapshot
            }

            assertNotNull(accessor.auth())
            assertNotNull(accessor.base())
            assertNotNull(accessor.order())

            delay(TEST_ENGINE_RETIREMENT_DELAY_MILLIS * 3)

            assertTrue(closedEngineIds.containsAll(retiredEngineIds))
            assertFalse(closedEngineIds.contains(previousSnapshot.engineId))
        } finally {
            accessor.close()
        }
    }

    private fun createAccessor(
        registrationState: MutableStateFlow<RegistrationState>,
        closedEngineIds: MutableList<Int>,
    ): TerminalApiAccessorInner {
        return TerminalApiAccessorInner(
            registrationState = registrationState,
            retry = false,
            engineRetirementDelayMillis = TEST_ENGINE_RETIREMENT_DELAY_MILLIS,
            engineHandleFactory = { id ->
                TrackingApiEngineHandle(
                    id = id,
                    engine = CIO.create { https { } },
                    closedEngineIds = closedEngineIds,
                )
            },
        )
    }

    private suspend fun waitForSnapshot(
        accessor: TerminalApiAccessorInner,
        predicate: (ApiSnapshotDebugInfo) -> Boolean = { true },
    ): ApiSnapshotDebugInfo {
        repeat(200) {
            val snapshot = accessor.currentSnapshotDebugInfo()
            if (snapshot != null && predicate(snapshot)) {
                return snapshot
            }
            delay(10)
        }

        throw AssertionError("Timed out waiting for published API snapshot")
    }

    private fun registeredState(token: String, apiUrl: String): RegistrationState.Registered {
        return RegistrationState.Registered(
            token = token,
            apiUrl = apiUrl,
        )
    }

    private class TrackingApiEngineHandle(
        override val id: Int,
        override val engine: HttpClientEngine,
        private val closedEngineIds: MutableList<Int>,
    ) : ApiEngineHandle {
        override fun close() {
            closedEngineIds += id
            engine.close()
        }
    }

    companion object {
        private const val TEST_ENGINE_RETIREMENT_DELAY_MILLIS = 100L
    }
}
