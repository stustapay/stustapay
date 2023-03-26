package de.stustanet.stustapay.repository


import android.util.Base64
import android.util.Log
import de.stustanet.stustapay.model.RegisterQRCodeContent
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.netsource.RegistrationRemoteDataSource
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import de.stustanet.stustapay.util.merge
import io.ktor.utils.io.errors.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

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
        localRegState.emit(RegistrationState.Pending("registering..."))

        val state = registerAsState(qrcode_b64)

        // only persist if registration was successful
        if (state is RegistrationState.Registered) {
            registrationLocalDataSource.setState(state)
        } else {
            localRegState.emit(state)
        }
    }

    suspend fun deregister() {
        // TODO: maybe try to send a request to inform the server?
        registrationLocalDataSource.delete()
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

            val registrationResponse = registrationRemoteDataSource.register(
                regCode.core_url,
                regCode.registration_uuid
            )

            return when (registrationResponse) {
                is Response.OK -> {
                    RegistrationState.Registered(
                        token = registrationResponse.data.token,
                        apiUrl = regCode.core_url,
                        message = "success",
                    )
                }
                is Response.Error.Msg -> {
                    RegistrationState.Error(
                        message = "error: ${registrationResponse.msg}, endpoint=${regCode.core_url}, code=${registrationResponse.code}",
                    )
                }
                is Response.Error.Exception -> {
                    RegistrationState.Error(
                        message = "exception: ${registrationResponse.throwable.localizedMessage}, endpoint=${regCode.core_url}",
                    )
                }
            }

        } catch (e: Exception) {
            Log.e("StuStaPay", "exception during registration", e)
            return RegistrationState.Error(
                message = "error: ${e.javaClass.name}: ${e.localizedMessage}",
            )
        }
    }
}
