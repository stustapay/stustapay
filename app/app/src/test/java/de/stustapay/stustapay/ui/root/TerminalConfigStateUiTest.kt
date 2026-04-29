package de.stustapay.stustapay.ui.root

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.TerminalMode
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigState
import de.stustapay.stustapay.ui.common.TerminalLoginState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TerminalConfigStateUiTest {
    @Test
    fun `stale success shows startpage warning while keeping terminal ready`() {
        val state = TerminalConfigState.Success(
            config = terminalConfig(),
            refreshErrorMessage = "backend timeout",
        )

        assertEquals(
            "Configuration refresh failed: backend timeout",
            terminalConfigStatusMessage(state),
        )
        assertTrue(TerminalLoginState(user = UserState.NoLogin, terminal = state).hasConfig())
    }

    @Test
    fun `stale success shows border warning instead of clearing config`() {
        val state = TerminalConfigState.Success(
            config = terminalConfig(),
            refreshErrorMessage = "backend timeout",
        )

        assertEquals(
            BorderState.Border("config refresh failed: backend timeout"),
            terminalConfigBorderState(state),
        )
    }

    private fun terminalConfig(): TerminalConfig {
        return TerminalConfig(
            id = 1.toBigInteger(),
            name = "Test Terminal",
            description = null,
            mode = TerminalMode.till,
            entryArea = null,
            selfService = false,
            eventName = "Test Event",
            activeUserId = null,
            availableRoles = emptyList(),
            userPrivileges = null,
            secrets = null,
            till = null,
            testMode = false,
            testModeMessage = "",
        )
    }
}
