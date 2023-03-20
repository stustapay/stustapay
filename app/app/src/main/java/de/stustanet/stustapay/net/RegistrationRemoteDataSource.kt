package de.stustanet.stustapay.net

import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import javax.inject.Inject


class RegistrationRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun register(apiUrl: String, registrationToken: String): TerminalRegistrationSuccess {
        return terminalAPI.register(startApiUrl = apiUrl, registrationToken = registrationToken)
    }
}