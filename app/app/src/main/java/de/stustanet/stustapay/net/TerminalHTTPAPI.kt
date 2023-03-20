package de.stustanet.stustapay.net

import android.util.Log
import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.PendingOrder
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.http.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.serialization.Serializable
import javax.inject.Inject


@Serializable
data class RegistrationRequest(
    val registration_uuid: String
)

@Serializable
data class RegistrationResponse(
    val token: String
)


/**
 * contact the terminal api via http.
 */
class TerminalHTTPAPI @Inject constructor(
    private val regLocalStatus: RegistrationLocalDataSource,
) : TerminalAPI {

    private suspend fun getApiUrl(): String {
        var url: String? = null

        Log.i("stustapay", "getting api url...")

        coroutineScope {
            val done = Channel<Unit>()
            val job = launch {
                // wait until we get a valid url.
                // otherwise requests don't make sense anyway.
                val urlUpdates = regLocalStatus.registrationState.stateIn(this)
                urlUpdates.collect() { registerState ->
                    url = when (registerState) {
                        is RegistrationState.Registered -> {
                            registerState.apiUrl
                        }
                        is RegistrationState.Error -> {
                            null
                        }
                    }
                    if (url != null) {
                        done.send(Unit)
                    }
                }
            }
            // the stateflow.collect can't be terminated from inside itself it seems,
            // so we have to cancel it...
            done.receive()
            job.cancel()
            job.join()
        }


        Log.i("stustapay", "got api url: $url")

        return url!!
    }

    override suspend fun register(
        startApiUrl: String,
        registrationToken: String
    ): TerminalRegistrationSuccess {
        var apiUrl = startApiUrl.removeSuffix("/")

        Log.i("StuStaPay", "call to register: $apiUrl $registrationToken")

        // TODO: handle returned errors
        // the api returns null when there's no such auth token.
        val response: TerminalRegistrationSuccess =
            httpClient.post("${apiUrl}/auth/register_terminal") {
                contentType(ContentType.Application.Json)
                setBody(RegistrationRequest(registrationToken))
            }.body()

        return response
    }

    override suspend fun createOrder(newOrder: NewOrder): PendingOrder {
        val apiUrl = getApiUrl()

        Log.i("StuStaPay", "call to createOrder: $apiUrl ${newOrder.customer_tag}")

        val response: PendingOrder =
            httpClient.post("${apiUrl}/order/create") {
                contentType(ContentType.Application.Json)
                setBody(newOrder)
            }.body()

        return response
    }
}