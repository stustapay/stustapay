package de.stustanet.stustapay.net

import android.util.Log
import de.stustanet.stustapay.model.HealthStatus
import io.ktor.client.call.*
import io.ktor.client.network.sockets.*
import io.ktor.client.request.*
import io.ktor.http.*
import kotlinx.serialization.Serializable
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.*
import java.net.ConnectException


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
    private val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }

        install(Logging)
    }

    override suspend fun getHealthStatus(apiUrl: String): String {
        return try {
            val health: HealthStatus = httpClient.get("${apiUrl}/health").body()
            "Status: ${health.status}"
        } catch (_: ConnectTimeoutException) {
            "Connection timeout"
        } catch (_: ConnectException) {
            "Connection refused"
        }
    }

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