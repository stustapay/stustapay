package de.stustapay.stustapay.repository

import de.stustapay.stustapay.model.TerminalConfig
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.netsource.TerminalConfigRemoteDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton


/**
 * Terminal configuration including validity state.
 */
sealed interface TerminalConfigState {
    object NoConfig : TerminalConfigState

    data class Success(
        var config: TerminalConfig
    ) : TerminalConfigState

    data class Error(
        val message: String
    ) : TerminalConfigState
}

@Singleton
class TerminalConfigRepository @Inject constructor(
    private val registrationRepository: RegistrationRepository,
    private val terminalConfigRemoteDataSource: TerminalConfigRemoteDataSource,
    private val nfcRepository: NfcRepository,
) {
    private var _terminalConfigState =
        MutableStateFlow<TerminalConfigState>(TerminalConfigState.NoConfig)
    var terminalConfigState = _terminalConfigState.asStateFlow()

    suspend fun fetchConfig() {
        if (!registrationRepository.isRegistered()) {
            _terminalConfigState.update { TerminalConfigState.NoConfig }
            return
        }

        when (val response = terminalConfigRemoteDataSource.getTerminalConfig()) {
            is Response.OK -> {
                _terminalConfigState.update { TerminalConfigState.Success(response.data) }
                // if we have secrets, save them
                response.data.secrets?.let {
                    nfcRepository.setTagKeys(it.user_tag_secret)
                }
            }

            is Response.Error -> {
                _terminalConfigState.update { TerminalConfigState.Error(response.msg()) }
            }
        }
    }

    fun clearConfig() {
        _terminalConfigState.update { TerminalConfigState.NoConfig }
    }
}
