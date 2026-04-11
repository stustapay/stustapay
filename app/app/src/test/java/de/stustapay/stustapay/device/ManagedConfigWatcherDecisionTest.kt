package de.stustapay.stustapay.device

import de.stustapay.stustapay.model.RegistrationSource
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.model.asManualRegistration
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ManagedConfigWatcherDecisionTest {
    @Test
    fun `managed registration is skipped when manual override is active`() {
        val currentState = RegistrationState.Registered(
            token = "manual-token",
            apiUrl = "https://manual.example",
        ).asManualRegistration()

        assertFalse(shouldApplyManagedRegistration(currentState, "managed-token", "https://managed.example"))
    }

    @Test
    fun `matching managed registration is not reapplied`() {
        val currentState = RegistrationState.Registered(
            token = "managed-token",
            apiUrl = "https://managed.example",
            source = RegistrationSource.MANAGED,
            managedConfigDisabled = false,
        )

        assertFalse(shouldApplyManagedRegistration(currentState, "managed-token", "https://managed.example"))
    }

    @Test
    fun `managed registration is applied again after override is reenabled`() {
        val currentState = RegistrationState.Registered(
            token = "manual-token",
            apiUrl = "https://manual.example",
            source = RegistrationSource.MANUAL,
            managedConfigDisabled = false,
        )

        assertTrue(shouldApplyManagedRegistration(currentState, "managed-token", "https://managed.example"))
    }

    @Test
    fun `deregistered manual override still blocks managed registration`() {
        val currentState = RegistrationState.NotRegistered(
            message = "deregistered",
            managedConfigDisabled = true,
        )

        assertFalse(shouldApplyManagedRegistration(currentState, "managed-token", "https://managed.example"))
    }
}
