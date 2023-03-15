package de.stustanet.stustapay.repository


import android.util.Base64
import android.util.Log
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.net.RegisterResult
import de.stustanet.stustapay.net.RegistrationRemoteDataSource
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import de.stustanet.stustapay.util.merge
import io.ktor.utils.io.errors.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton


/**
 * as defined in the administration's registration ui qrcode generator
 */
@Serializable
data class RegisterQRCodeContent(
    val core_url: String,
    val registration_uuid: String,
)

@Singleton
class RegistrationRepository @Inject constructor(
    private val registrationRemoteDataSource: RegistrationRemoteDataSource,
    private val registrationLocalDataSource: RegistrationLocalDataSource
) {
    // for local insertions of values without the datasources
    var localRegState = MutableSharedFlow<RegistrationState>()
    var registrationState: Flow<RegistrationState> =
        registrationLocalDataSource.registrationState.merge(localRegState)

    suspend fun register(
        qrcode_b64: String,
    ) {
        val state = registerAsState(qrcode_b64)

        // only persist if registration was successful
        if (state is RegistrationState.Registered) {
            registrationLocalDataSource.setState(state)
        } else {
            localRegState.emit(state)
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

            val registerResult: RegisterResult
            try {
                registerResult = registrationRemoteDataSource.register(
                    regCode.core_url,
                    regCode.registration_uuid
                )
            } catch (e: IOException) {
                return RegistrationState.Error(
                    message = "error during io: ${e.localizedMessage}, endpoint=${regCode.core_url}",
                )
            }

            return RegistrationState.Registered(
                token = registerResult.token,
                apiUrl = regCode.core_url,
                message = "success",
            )
        } catch (e: Exception) {
            Log.e("StuStaPay", "exception during registration", e)
            return RegistrationState.Error(
                message = "error: ${e.javaClass.name}: ${e.localizedMessage}",
            )
        }
    }
}
