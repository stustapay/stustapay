package de.stustapay.stustapay.storage

import androidx.datastore.core.DataStoreFactory
import de.stustapay.stustapay.model.RegistrationSource
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.model.asManualRegistration
import de.stustapay.stustapay.proto.RegistrationStateProto
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File

class RegistrationStateStorageTest {
    @Test
    fun `serializer reads legacy registered state with default metadata`() = runBlocking {
        val legacyState = RegistrationStateProto.newBuilder()
            .setRegistered(true)
            .setApiEndpoint("https://legacy.example")
            .setAuthToken("legacy-token")
            .build()

        val parsed = RegistrationStateSerializer.readFrom(ByteArrayInputStream(legacyState.toByteArray()))

        assertTrue(parsed is RegistrationState.Registered)
        parsed as RegistrationState.Registered
        assertEquals("legacy-token", parsed.token)
        assertEquals("https://legacy.example", parsed.apiUrl)
        assertEquals(RegistrationSource.UNKNOWN, parsed.source)
        assertFalse(parsed.managedConfigDisabled)
    }

    @Test
    fun `serializer round trips registration source and override metadata`() = runBlocking {
        val serialized = ByteArrayOutputStream()
        RegistrationStateSerializer.writeTo(
            RegistrationState.Registered(
                token = "manual-token",
                apiUrl = "https://manual.example",
                message = "manual",
                source = RegistrationSource.MANUAL,
                managedConfigDisabled = true,
            ),
            serialized,
        )

        val parsed = RegistrationStateSerializer.readFrom(ByteArrayInputStream(serialized.toByteArray()))

        assertTrue(parsed is RegistrationState.Registered)
        parsed as RegistrationState.Registered
        assertEquals("manual-token", parsed.token)
        assertEquals("https://manual.example", parsed.apiUrl)
        assertEquals(RegistrationSource.MANUAL, parsed.source)
        assertTrue(parsed.managedConfigDisabled)
    }

    @Test
    fun `clearing registration preserves managed config override`() = runBlocking {
        val dataStore = createDataStore()
        val localDataSource = RegistrationLocalDataSource(dataStore)
        val repositoryInner = RegistrationRepositoryInner(localDataSource)

        repositoryInner.storeState(
            RegistrationState.Registered(
                token = "manual-token",
                apiUrl = "https://manual.example",
            ).asManualRegistration()
        )

        repositoryInner.clearRegistration()

        val parsed = localDataSource.registrationState.first()
        assertTrue(parsed is RegistrationState.NotRegistered)
        parsed as RegistrationState.NotRegistered
        assertTrue(parsed.managedConfigDisabled)
    }

    @Test
    fun `reenabling managed config clears override and keeps registration`() = runBlocking {
        val dataStore = createDataStore()
        val localDataSource = RegistrationLocalDataSource(dataStore)
        val repositoryInner = RegistrationRepositoryInner(localDataSource)

        repositoryInner.storeState(
            RegistrationState.Registered(
                token = "manual-token",
                apiUrl = "https://manual.example",
            ).asManualRegistration()
        )

        repositoryInner.setManagedConfigDisabled(false)

        val parsed = localDataSource.registrationState.first()
        assertTrue(parsed is RegistrationState.Registered)
        parsed as RegistrationState.Registered
        assertEquals("manual-token", parsed.token)
        assertEquals("https://manual.example", parsed.apiUrl)
        assertEquals(RegistrationSource.MANUAL, parsed.source)
        assertFalse(parsed.managedConfigDisabled)
    }

    private fun createDataStore() = DataStoreFactory.create(
        serializer = RegistrationStateSerializer,
        produceFile = {
            File.createTempFile("registration-state", ".pb").apply {
                deleteOnExit()
            }
        }
    )
}
