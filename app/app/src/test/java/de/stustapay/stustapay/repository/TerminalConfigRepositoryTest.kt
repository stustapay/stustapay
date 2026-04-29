package de.stustapay.stustapay.repository

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.TerminalMode
import de.stustapay.api.models.TerminalSecrets
import de.stustapay.api.models.UserTagSecret
import de.stustapay.libssp.net.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class TerminalConfigRepositoryTest {
    @Test
    fun `initial fetch failure without prior config emits error and keeps retrying`() {
        val result = terminalConfigFetchResult(
            currentState = TerminalConfigState.NoConfig,
            response = Response.Error.Service.Generic("backend timeout"),
        )

        assertEquals(TerminalConfigState.Error("backend timeout"), result.state)
        assertNull(result.userTagSecret)
        assertFalse(result.ok)
        assertTrue(result.shouldRetry)
    }

    @Test
    fun `successful fetch stores config without stale warning and exposes nfc keys`() {
        val secret = userTagSecret()
        val config = terminalConfig("fresh", secret)

        val result = terminalConfigFetchResult(
            currentState = TerminalConfigState.NoConfig,
            response = Response.OK(config),
        )

        val state = result.state as TerminalConfigState.Success
        assertEquals(config, state.config)
        assertNull(state.refreshErrorMessage)
        assertEquals(secret, result.userTagSecret)
        assertTrue(result.ok)
        assertFalse(result.shouldRetry)
    }

    @Test
    fun `refresh failure after success preserves config and records stale warning`() {
        val config = terminalConfig("cached", userTagSecret())

        val result = terminalConfigFetchResult(
            currentState = TerminalConfigState.Success(config),
            response = Response.Error.Service.Generic("backend timeout"),
        )

        val state = result.state as TerminalConfigState.Success
        assertSame(config, state.config)
        assertEquals("backend timeout", state.refreshErrorMessage)
        assertNull(result.userTagSecret)
        assertFalse(result.ok)
        assertTrue(result.shouldRetry)
    }

    @Test
    fun `later successful fetch replaces stale config and clears warning`() {
        val staleConfig = terminalConfig("cached", userTagSecret())
        val freshSecret = userTagSecret(key0 = "03".repeat(16), key1 = "04".repeat(16))
        val freshConfig = terminalConfig("fresh", freshSecret)

        val result = terminalConfigFetchResult(
            currentState = TerminalConfigState.Success(staleConfig, refreshErrorMessage = "backend timeout"),
            response = Response.OK(freshConfig),
        )

        val state = result.state as TerminalConfigState.Success
        assertEquals(freshConfig, state.config)
        assertNull(state.refreshErrorMessage)
        assertEquals(freshSecret, result.userTagSecret)
        assertTrue(result.ok)
        assertFalse(result.shouldRetry)
    }

    @Test
    fun `missing user tag secret is hard error without prior config`() {
        val result = terminalConfigFetchResult(
            currentState = TerminalConfigState.NoConfig,
            response = Response.OK(terminalConfig("missing-secret", userTagSecret = null)),
        )

        assertEquals(
            TerminalConfigState.Error(TERMINAL_CONFIG_MISSING_USER_TAG_SECRET_MESSAGE),
            result.state,
        )
        assertNull(result.userTagSecret)
        assertFalse(result.ok)
        assertTrue(result.shouldRetry)
    }

    @Test
    fun `missing user tag secret preserves prior config as stale`() {
        val config = terminalConfig("cached", userTagSecret())

        val result = terminalConfigFetchResult(
            currentState = TerminalConfigState.Success(config),
            response = Response.OK(terminalConfig("missing-secret", userTagSecret = null)),
        )

        val state = result.state as TerminalConfigState.Success
        assertSame(config, state.config)
        assertEquals(TERMINAL_CONFIG_MISSING_USER_TAG_SECRET_MESSAGE, state.refreshErrorMessage)
        assertNull(result.userTagSecret)
        assertFalse(result.ok)
        assertTrue(result.shouldRetry)
    }

    private fun terminalConfig(
        name: String,
        userTagSecret: UserTagSecret?,
    ): TerminalConfig {
        return TerminalConfig(
            id = 1.toBigInteger(),
            name = name,
            description = null,
            mode = TerminalMode.till,
            entryArea = null,
            selfService = false,
            eventName = "Test Event",
            activeUserId = null,
            availableRoles = emptyList(),
            userPrivileges = null,
            secrets = TerminalSecrets(userTagSecret = userTagSecret),
            till = null,
            testMode = false,
            testModeMessage = "",
        )
    }

    private fun userTagSecret(
        key0: String = "01".repeat(16),
        key1: String = "02".repeat(16),
    ): UserTagSecret {
        return UserTagSecret(key0 = key0, key1 = key1)
    }
}
