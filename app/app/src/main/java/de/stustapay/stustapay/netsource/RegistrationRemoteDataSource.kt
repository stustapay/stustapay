package de.stustapay.stustapay.netsource

import de.stustapay.api.models.TerminalRegistrationPayload
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.model.DeregistrationState
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject


class RegistrationRemoteDataSource @Inject constructor(
    private val terminalApiAccessor: TerminalApiAccessor
) {
    suspend fun register(
        apiUrl: String, registrationToken: String
    ): RegistrationState {
        return when (val registrationResponse = terminalApiAccessor.execute {
            it.auth()?.registerTerminal(TerminalRegistrationPayload(registrationToken))
        }) {
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
        return when (val deregistrationResponse = terminalApiAccessor.execute {
            it.auth()?.logoutTerminal()
        }) {
            is Response.OK -> {
                DeregistrationState.Deregistered
            }

            is Response.Error -> {
                DeregistrationState.Error(deregistrationResponse.msg())
            }
        }
    }
}