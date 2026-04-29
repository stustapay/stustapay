package de.stustapay.stustapay.repository

import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.UserTagSecret
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
        var config: TerminalConfig,
        val refreshErrorMessage: String? = null,
    ) : TerminalConfigState

    data class Error(
        val message: String
    ) : TerminalConfigState
}

internal data class TerminalConfigFetchResult(
    val state: TerminalConfigState,
    val userTagSecret: UserTagSecret?,
    val ok: Boolean,
    val shouldRetry: Boolean,
)

internal const val TERMINAL_CONFIG_MISSING_USER_TAG_SECRET_MESSAGE =
    "terminal config missing user tag secret"

internal fun terminalConfigFetchResult(
    currentState: TerminalConfigState,
    response: Response<TerminalConfig>,
): TerminalConfigFetchResult {
    return when (response) {
        is Response.OK -> {
            val userTagSecret = response.data.secrets?.userTagSecret
            if (userTagSecret == null) {
                staleOrErrorResult(
                    currentState = currentState,
                    message = TERMINAL_CONFIG_MISSING_USER_TAG_SECRET_MESSAGE,
                )
            } else {
                TerminalConfigFetchResult(
                    state = TerminalConfigState.Success(response.data),
                    userTagSecret = userTagSecret,
                    ok = true,
                    shouldRetry = false,
                )
            }
        }

        is Response.Error -> {
            staleOrErrorResult(
                currentState = currentState,
                message = response.msg(),
            )
        }
    }
}

private fun staleOrErrorResult(
    currentState: TerminalConfigState,
    message: String,
): TerminalConfigFetchResult {
    return when (currentState) {
        is TerminalConfigState.Success -> {
            TerminalConfigFetchResult(
                state = currentState.copy(refreshErrorMessage = message),
                userTagSecret = null,
                ok = false,
                shouldRetry = true,
            )
        }

        else -> {
            TerminalConfigFetchResult(
                state = TerminalConfigState.Error(message),
                userTagSecret = null,
                ok = false,
                shouldRetry = true,
            )
        }
    }
}

@Singleton
class TerminalConfigRepository @Inject constructor(
    private val registrationRepository: RegistrationRepository,
    private val terminalConfigRemoteDataSource: TerminalConfigRemoteDataSource,
    private val nfcRepository: NfcRepository,
) {
    private val _terminalConfigState =
        MutableStateFlow<TerminalConfigState>(TerminalConfigState.NoConfig)
    var terminalConfigState = _terminalConfigState.asStateFlow()

    private val _fetching = MutableStateFlow(false)
    val fetching = _fetching.asStateFlow()

    suspend fun fetchConfig(keepTrying: Boolean): Boolean {
        try {
            _fetching.update { true }
            return fetchConfig_(keepTrying)
        }
        finally {
            _fetching.update { false }
        }
    }

    private suspend fun fetchConfig_(keepTrying: Boolean): Boolean {
        if (!registrationRepository.isRegistered()) {
            _terminalConfigState.update { TerminalConfigState.NoConfig }
            return true
        }

        var ok: Boolean
        while (true) {
            val result = terminalConfigFetchResult(
                currentState = _terminalConfigState.value,
                response = terminalConfigRemoteDataSource.getTerminalConfig(),
            )
            _terminalConfigState.update { result.state }
            result.userTagSecret?.let { nfcRepository.setTagKeys(it) }
            ok = result.ok

            if (!ok && keepTrying && result.shouldRetry) {
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
                cfg.config.till?.sumupSecrets?.sumupApiKeyExpiresAt?.let {
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
