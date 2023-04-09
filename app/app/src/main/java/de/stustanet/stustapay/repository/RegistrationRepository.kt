package de.stustanet.stustapay.repository


import android.util.Base64
import android.util.Log
import de.stustanet.stustapay.model.DeregistrationState
import de.stustanet.stustapay.model.RegisterQRCodeContent
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.netsource.RegistrationRemoteDataSource
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import de.stustanet.stustapay.util.merge
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
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
    private val registrationLocalDataSource: RegistrationLocalDataSource
) {
    // for local insertions of values without the datasources
    var localRegState = MutableSharedFlow<RegistrationState>()
    var registrationState: Flow<RegistrationState> =
        registrationLocalDataSource.registrationState.merge(localRegState)

    var forceDeregisterState = MutableStateFlow<ForceDeregisterState>(ForceDeregisterState.Disallow)

    suspend fun register(
        qrcode_b64: String,
    ) {
        localRegState.emit(RegistrationState.NotRegistered("registering..."))
        forceDeregisterState.emit(ForceDeregisterState.Disallow)

        val state = registerAsState(qrcode_b64)

        // only persist if registration was successful
        if (state is RegistrationState.Registered) {
            registrationLocalDataSource.setState(state)
        } else {
            localRegState.emit(state)
        }
    }

    suspend fun deregister(force: Boolean = false) {
        when (val result = registrationRemoteDataSource.deregister()) {
            is DeregistrationState.Error -> {
                // remote deregistration failed
                if (force) {
                    // delete the local state anyway
                    registrationLocalDataSource.delete()
                    forceDeregisterState.emit(ForceDeregisterState.Disallow)
                } else {
                    // allow deleting local state anyway
                    forceDeregisterState.emit(ForceDeregisterState.Allow(result.message))
                }
            }
            is DeregistrationState.Deregistered -> {
                registrationLocalDataSource.delete()
                forceDeregisterState.emit(ForceDeregisterState.Disallow)
            }
        }
    }

    private suspend fun registerAsState(qrcode_b64: String): RegistrationState {
        try {
            val regCode: RegisterQRCodeContent
            try {
                val decodedBytes = Base64.decode(qrcode_b64, Base64.DEFAULT)
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
