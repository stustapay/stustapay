package de.stustapay.stustapay.repository

import de.stustapay.api.models.TerminalConfig
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.netsource.TerminalConfigRemoteDataSource
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.OffsetDateTime
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

    suspend fun fetchConfig(keepTrying: Boolean): Boolean {
        if (!registrationRepository.isRegistered()) {
            _terminalConfigState.update { TerminalConfigState.NoConfig }
            return true
        }

        var ok: Boolean
        while (true) {
            ok = when (val response = terminalConfigRemoteDataSource.getTerminalConfig()) {
                is Response.OK -> {
                    _terminalConfigState.update { TerminalConfigState.Success(response.data) }
                    // if we have secrets, save them
                    response.data.till?.secrets?.let {
                        nfcRepository.setTagKeys(it.userTagSecret)
                    }
                    true
                }

                is Response.Error -> {
                    _terminalConfigState.update { TerminalConfigState.Error(response.msg()) }
                    false
                }
            }

            if (!ok && keepTrying) {
                delay(1000)
                continue
            }
            break
        }
        return ok
    }

    fun clearConfig() {
        _terminalConfigState.update { TerminalConfigState.NoConfig }
    }

    /** some tokens need a periodic config refresh. test and perform the refresh */
    suspend fun tokenRefresh() {
        when (val cfg = terminalConfigState.value) {
            is TerminalConfigState.Success -> {
                cfg.config.till?.secrets?.sumupApiKeyExpiresAt?.let {
                    val expiry = it
                    val currentTime = OffsetDateTime.now()
                    val secondsLeft = expiry.toEpochSecond() - currentTime.toEpochSecond()

                    if (secondsLeft < 60 * 9) {
                        // get a new config with fresh token
                        fetchConfig(keepTrying = true)
                    }
                }
            }

            else -> {}
        }
    }
}
