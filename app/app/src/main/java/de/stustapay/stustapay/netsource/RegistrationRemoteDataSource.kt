package de.stustapay.stustapay.netsource

import de.stustapay.stustapay.model.DeregistrationState
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.net.TerminalAPI
import javax.inject.Inject


class RegistrationRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun register(
        apiUrl: String,
        registrationToken: String
    ): RegistrationState {
        return when (val registrationResponse =
            terminalAPI.register(startApiUrl = apiUrl, registrationToken = registrationToken)) {
            is Response.OK -> {
                RegistrationState.Registered(
                    token = registrationResponse.data.token,
                    apiUrl = apiUrl,
                    message = "success",
                )
            }

            is Response.Error -> {
                RegistrationState.Error(
                    message = registrationResponse.msg(),
                )
            }
        }
    }

    suspend fun deregister(): DeregistrationState {
        return when (val deregistrationResponse = terminalAPI.deregister()) {
            is Response.OK -> {
                DeregistrationState.Deregistered
            }

            is Response.Error -> {
                DeregistrationState.Error(deregistrationResponse.msg())
            }
        }
    }
}