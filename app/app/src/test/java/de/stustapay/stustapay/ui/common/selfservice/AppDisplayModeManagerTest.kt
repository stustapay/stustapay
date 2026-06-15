package de.stustapay.stustapay.ui.common.selfservice

import org.junit.Assert.assertEquals
import org.junit.Test

class AppDisplayModeManagerTest {
    @Test
    fun `resolve stored mode prefers current app value`() {
        val resolved = AppDisplayModeManager.resolveStoredMode(
            storedValue = "day",
            legacyValue = "night",
        )

        assertEquals(AppDisplayMode.Day, resolved)
    }

    @Test
    fun `resolve stored mode falls back to legacy self service value`() {
        val resolved = AppDisplayModeManager.resolveStoredMode(
            storedValue = null,
            legacyValue = "day",
        )

        assertEquals(AppDisplayMode.Day, resolved)
    }

    @Test
    fun `resolve stored mode defaults to night for unknown values`() {
        val resolved = AppDisplayModeManager.resolveStoredMode(
            storedValue = "unknown",
            legacyValue = null,
        )

        assertEquals(AppDisplayMode.Night, resolved)
    }
}
