package de.stustanet.stustapay.net

import android.util.Log
import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.PendingOrder
import de.stustanet.stustapay.model.RegistrationState
import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import javax.inject.Inject


/**
 * contact the terminal api via http.
 */
class TerminalHTTPAPI @Inject constructor(
    private val regLocalStatus: RegistrationLocalDataSource,
) : TerminalAPI {

    /**
     * create a http client that can fetch base url and login token
     * through our current api registration state.
     */
    private val client: HttpClient = HttpClient {
        var regState = regLocalStatus.registrationState.first()

        var api: HttpClientTarget? = when (regState) {
            null -> null
            is RegistrationState.Registered -> {
                HttpClientTarget(regState.apiUrl, regState.token)
            }
            is RegistrationState.Error -> {
                null
            }
            is RegistrationState.Pending -> {
                null
            }
        }

        api
    }


    /**
     * register the terminal at the till.
     * special implementation: we don't have an api endpoint or key yet,
     * therefore the request has to be done manually.
     */
    override suspend fun register(
        startApiUrl: String,
        registrationToken: String
    ): Response<TerminalRegistrationSuccess> {
        var apiUrl = startApiUrl.removeSuffix("/")

        Log.i("StuStaPay", "call to register: $apiUrl $registrationToken")

        @Serializable
        data class RegistrationRequest(
            val registration_uuid: String
        )

        return client.post("auth/register_terminal", basePath = apiUrl) {
            RegistrationRequest(registrationToken)
        }
    }

    override suspend fun createOrder(newOrder: NewOrder): Response<PendingOrder> {
        return client.post("order/create") { newOrder }
    }
}