package de.stustanet.stustapay.netsource

import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject


class RegistrationRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun register(
        apiUrl: String,
        registrationToken: String
    ): Response<TerminalRegistrationSuccess> {
        return terminalAPI.register(startApiUrl = apiUrl, registrationToken = registrationToken)
    }
}