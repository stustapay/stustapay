package de.stustapay.stustapay.device

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ManagedWifiSuggestionRepositoryTest {
    @Test
    fun `parses legacy custom3 as terminal name`() {
        val parsed = parseHeadwindCustom3("Terminal A")

        assertEquals("Terminal A", parsed.terminalName)
        assertNull(parsed.wifiConfig)
    }

    @Test
    fun `parses json custom3 with wifi`() {
        val parsed = parseHeadwindCustom3(
            """{"terminal_name":"Terminal A","wifi_ssid":"festival","wifi_passphrase":"secret1234"}"""
        )

        assertEquals("Terminal A", parsed.terminalName)
        assertEquals(ManagedWifiConfig("festival", "secret1234"), parsed.wifiConfig)
    }

    @Test
    fun `unchanged wifi does not re-suggest`() = runBlocking {
        val client = FakeWifiSuggestionClient()
        val store = FakeManagedWifiSuggestionStateStore()
        val repository = ManagedWifiSuggestionRepository(client, store)
        val config = ManagedWifiConfig("festival", "secret1234")

        repository.syncManagedConfig(config)
        repository.syncManagedConfig(config)

        assertEquals(1, client.addedConfigs.size)
        assertEquals(config, store.state.value.appliedConfig)
    }

    @Test
    fun `changed wifi replaces existing suggestion`() = runBlocking {
        val client = FakeWifiSuggestionClient()
        val store = FakeManagedWifiSuggestionStateStore()
        val repository = ManagedWifiSuggestionRepository(client, store)
        val first = ManagedWifiConfig("festival-a", "secret1234")
        val second = ManagedWifiConfig("festival-b", "secret5678")

        repository.syncManagedConfig(first)
        repository.syncManagedConfig(second)

        assertEquals(listOf(first, second), client.addedConfigs)
        assertEquals(listOf(first), client.removedConfigs)
        assertEquals(second, store.state.value.appliedConfig)
    }

    @Test
    fun `cleared wifi removes suggestion and clears state`() = runBlocking {
        val client = FakeWifiSuggestionClient()
        val store = FakeManagedWifiSuggestionStateStore()
        val repository = ManagedWifiSuggestionRepository(client, store)
        val config = ManagedWifiConfig("festival", "secret1234")

        repository.syncManagedConfig(config)
        repository.syncManagedConfig(null)

        assertEquals(listOf(config), client.removedConfigs)
        assertEquals(ManagedWifiSuggestionState(), store.state.value)
    }

    @Test
    fun `failed wifi suggestion keeps desired config for manual retry`() = runBlocking {
        val config = ManagedWifiConfig("festival", "secret1234")
        val client = FakeWifiSuggestionClient(
            addResults = ArrayDeque(
                listOf(
                    WifiSuggestionResult.Failure("policy blocked"),
                    WifiSuggestionResult.Success,
                )
            )
        )
        val store = FakeManagedWifiSuggestionStateStore()
        val repository = ManagedWifiSuggestionRepository(client, store)

        repository.syncManagedConfig(config)

        assertEquals(config, store.state.value.desiredConfig)
        assertNull(store.state.value.appliedConfig)
        assertEquals("policy blocked", store.state.value.lastErrorMessage)

        repository.retrySuggestion()

        assertEquals(config, store.state.value.appliedConfig)
        assertNull(store.state.value.lastErrorMessage)
        assertTrue(client.addedConfigs.size == 2)
    }
}

private class FakeManagedWifiSuggestionStateStore : ManagedWifiSuggestionStateStore {
    private val mutableState = MutableStateFlow(ManagedWifiSuggestionState())
    override val state: StateFlow<ManagedWifiSuggestionState> = mutableState.asStateFlow()

    override fun updateState(state: ManagedWifiSuggestionState) {
        mutableState.value = state
    }
}

private class FakeWifiSuggestionClient(
    private val addResults: ArrayDeque<WifiSuggestionResult> = ArrayDeque(),
) : WifiSuggestionClient {
    val addedConfigs = mutableListOf<ManagedWifiConfig>()
    val removedConfigs = mutableListOf<ManagedWifiConfig>()

    override suspend fun addSuggestion(config: ManagedWifiConfig): WifiSuggestionResult {
        addedConfigs += config
        return addResults.removeFirstOrNull() ?: WifiSuggestionResult.Success
    }

    override suspend fun removeSuggestion(config: ManagedWifiConfig): WifiSuggestionResult {
        removedConfigs += config
        return WifiSuggestionResult.Success
    }
}
