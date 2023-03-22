package de.stustanet.stustapay.net

import javax.inject.Inject


data class RegisterResult(
    var token: String
)

class RegistrationRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun register(apiUrl: String, registrationToken: String): RegisterResult {
        return terminalAPI.register(apiUrl = apiUrl, registrationToken = registrationToken)
    }
}