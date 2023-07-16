package de.stustapay.stustapay.repository


import android.util.Base64
import android.util.Log
import de.stustapay.stustapay.model.DeregistrationState
import de.stustapay.stustapay.model.RegisterQRCodeContent
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.netsource.RegistrationRemoteDataSource
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
import de.stustapay.stustapay.util.merge
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

sealed interface ForceDeregisterState {
    data class Allow(val msg: String) : ForceDeregisterState
    object Disallow : ForceDeregisterState
}

@Singleton
class RegistrationRepository @Inject constructor(
    private val registrationRemoteDataSource: RegistrationRemoteDataSource,
    private val registrationLocalDataSource: RegistrationLocalDataSource,
) {
    // for local insertions of values without the datasources
    private var _regState = MutableSharedFlow<RegistrationState>()
    var registrationState: Flow<RegistrationState> =
        registrationLocalDataSource.registrationState.merge(_regState)

    var forceDeregisterState = MutableStateFlow<ForceDeregisterState>(ForceDeregisterState.Disallow)

    suspend fun isRegistered(): Boolean {
        return try {
            val regState = registrationLocalDataSource.registrationState.first()
            regState is RegistrationState.Registered
        } catch (e : NoSuchElementException) {
            false
        }
    }

    suspend fun register(
        qrcodeB64: String,
    ): Boolean {
        _regState.tryEmit(RegistrationState.NotRegistered("Registering..."))
        forceDeregisterState.tryEmit(ForceDeregisterState.Disallow)

        val state = registerAsState(qrcodeB64)

        // only persist if registration was successful
        return if (state is RegistrationState.Registered) {
            registrationLocalDataSource.setState(state)
            true
        } else {
            _regState.tryEmit(state)
            false
        }
    }

    suspend fun deregister(force: Boolean = false): Boolean {
        return when (val result = registrationRemoteDataSource.deregister()) {
            is DeregistrationState.Error -> {
                // remote deregistration failed
                if (force) {
                    // delete the local state anyway
                    registrationLocalDataSource.delete()
                    forceDeregisterState.tryEmit(ForceDeregisterState.Disallow)
                    true
                } else {
                    // allow deleting local state anyway
                    forceDeregisterState.tryEmit(ForceDeregisterState.Allow(result.message))
                    false
                }
            }

            is DeregistrationState.Deregistered -> {
                registrationLocalDataSource.delete()
                forceDeregisterState.tryEmit(ForceDeregisterState.Disallow)
                true
            }
        }
    }

    private suspend fun registerAsState(qrcodeB64: String): RegistrationState {
        try {
            val regCode: RegisterQRCodeContent
            try {
                val decodedBytes = Base64.decode(qrcodeB64, Base64.DEFAULT)
                regCode = Json.decodeFromString(String(decodedBytes))
            } catch (e: SerializationException) {
                return RegistrationState.Error(
                    message = "error: failed to decode qr code: ${e.localizedMessage}",
                )
            } catch (e: IllegalArgumentException) {
                return RegistrationState.Error(
                    message = "error: qr code has wrong format: ${e.localizedMessage}",
                )
            }

            return registrationRemoteDataSource.register(
                regCode.core_url,
                regCode.registration_uuid
            )

        } catch (e: Exception) {
            Log.e("StuStaPay", "exception during registration", e)
            return RegistrationState.Error(
                message = "error: ${e.javaClass.name}: ${e.localizedMessage}",
            )
        }
    }
}
