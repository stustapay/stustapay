package de.stustanet.stustapay.net

import android.util.Log
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.http.*
import kotlinx.serialization.Serializable


@Serializable
data class RegistrationRequest(
    val registration_uuid: String
)

@Serializable
data class RegistrationResponse(
    val token: String
)


/**
 * reach the terminal api via http.
 */
class TerminalHTTPAPI : TerminalAPI {
    override suspend fun register(apiUrl: String, registrationToken: String): RegisterResult {

        Log.i("StuStaPay", "call to register: $apiUrl $registrationToken")

        // TODO: handle returned errors
        val response: RegistrationResponse = httpClient.post("${apiUrl}/auth/register_terminal") {
            contentType(ContentType.Application.Json)
            setBody(RegistrationRequest(registrationToken))
        }.body()

        return RegisterResult(token = response.token)
    }
}