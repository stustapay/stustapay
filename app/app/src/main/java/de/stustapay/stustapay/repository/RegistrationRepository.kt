package de.stustapay.stustapay.repository


import android.util.Base64
import android.util.Log
import de.stustapay.libssp.util.merge
import de.stustapay.stustapay.model.DeregistrationState
import de.stustapay.stustapay.model.RegisterQRCodeContent
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.netsource.RegistrationRemoteDataSource
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.serialization.SerializationException
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
    private val registrationRepositoryInner: RegistrationRepositoryInner,
) {
    var registrationState = registrationRepositoryInner.registrationState
    var forceDeregisterState = MutableStateFlow<ForceDeregisterState>(ForceDeregisterState.Disallow)

    suspend fun isRegistered(): Boolean {
        return registrationRepositoryInner.isRegistered()
    }

    suspend fun register(
        qrcodeB64: String,
    ): Boolean {
        registrationRepositoryInner.tryEmit(RegistrationState.NotRegistered("Starting registration..."))
        forceDeregisterState.tryEmit(ForceDeregisterState.Disallow)

        // sets state to registering...
        val state = registerAtCore(qrcodeB64)

        // only persist if registration was successful
        return if (state is RegistrationState.Registered) {
            registrationRepositoryInner.storeState(state)
            true
        } else {
            registrationRepositoryInner.tryEmit(state)
            false
        }
    }

    suspend fun deregister(force: Boolean = false): Boolean {
        return when (val result = registrationRemoteDataSource.deregister()) {
            is DeregistrationState.Error -> {
                // remote deregistration failed
                if (force) {
                    // delete the local state anyway
                    registrationRepositoryInner.delete()
                    forceDeregisterState.tryEmit(ForceDeregisterState.Disallow)
                    true
                } else {
                    // allow deleting local state anyway
                    forceDeregisterState.tryEmit(ForceDeregisterState.Allow(result.message))
                    false
                }
            }

            is DeregistrationState.Deregistered -> {
                registrationRepositoryInner.delete()
                forceDeregisterState.tryEmit(ForceDeregisterState.Disallow)
                true
            }
        }
    }

    private suspend fun registerAtCore(qrcodeB64: String): RegistrationState {
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

            registrationRepositoryInner.emit(RegistrationState.Registering(regCode.core_url))

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

@Singleton
class RegistrationRepositoryInner @Inject constructor(
    private val registrationLocalDataSource: RegistrationLocalDataSource,
) {
    // for local insertions of values without the datasources
    private var _regState =
        MutableStateFlow<RegistrationState>(RegistrationState.NotRegistered("initialization"))
    var registrationState: Flow<RegistrationState> =
        registrationLocalDataSource.registrationState.merge(_regState)

    suspend fun isRegistered(): Boolean {
        return try {
            val regState = registrationLocalDataSource.registrationState.first()
            regState is RegistrationState.Registered
        } catch (e: NoSuchElementException) {
            false
        }
    }

    fun tryEmit(s: RegistrationState): Boolean {
        return _regState.tryEmit(s)
    }

    suspend fun emit(s: RegistrationState) {
        _regState.emit(s)
    }

    suspend fun storeState(s: RegistrationState.Registered) {
        // this will also emit
        registrationLocalDataSource.setState(s)
    }

    suspend fun delete() {
        registrationLocalDataSource.delete()
    }
}
