package de.stustapay.stustapay.ui.debug

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.model.NfcScanFailure
import de.stustapay.stustapay.model.NfcScanResult
import de.stustapay.stustapay.repository.NfcRepository
import de.stustapay.stustapay.repository.ReadMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class NfcDebugViewModel @Inject constructor(
    private val nfcRepository: NfcRepository,
) : ViewModel() {
    private val _result = MutableStateFlow<NfcDebugScanResult>(NfcDebugScanResult.None)
    private val _enableAuth = MutableStateFlow(true)
    private val _enableCmac = MutableStateFlow(true)

    val uiState: StateFlow<NfcDebugViewUiState> =
        combine(_result, _enableAuth, _enableCmac) { result, enableAuth, enableCmac ->
            NfcDebugViewUiState(
                enableAuth = enableAuth,
                enableCmac = enableCmac,
                result = result
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = NfcDebugViewUiState()
        )

    suspend fun read() {
        when (val res =
            nfcRepository.read(ReadMode.Full(auth = _enableAuth.value, cmac = _enableCmac.value))) {
            is NfcScanResult.Read -> _result.emit(
                NfcDebugScanResult.ReadSuccess(
                    res.chipProtected,
                    res.chipUid,
                    res.chipContent
                )
            )

            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun program() {
        val requiresAuth = when (nfcRepository.read(ReadMode.Full(auth = false, cmac = false))) {
            is NfcScanResult.Read -> false
            else -> true
        }

        val requiresCmac = if (requiresAuth) {
            when (nfcRepository.read(ReadMode.Full(auth = true, cmac = false))) {
                is NfcScanResult.Read -> false
                else -> true
            }
        } else {
            false
        }

        nfcRepository.writeSig(requiresAuth, requiresCmac)
        nfcRepository.writeKey(requiresAuth, requiresCmac)
        nfcRepository.writeProtect(true, true, requiresCmac)
        nfcRepository.writeCmac(true, true, requiresCmac)
    }

    suspend fun readMultiKey() {
        when (val res = nfcRepository.readMultiKey(_enableAuth.value, _enableCmac.value)) {
            is NfcScanResult.Read -> _result.emit(
                NfcDebugScanResult.ReadSuccess(
                    res.chipProtected,
                    res.chipUid,
                    res.chipContent
                )
            )

            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun writeSig() {
        when (val res = nfcRepository.writeSig(_enableAuth.value, _enableCmac.value)) {
            is NfcScanResult.Write -> _result.emit(NfcDebugScanResult.WriteSuccess)
            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun writeKey() {
        when (val res = nfcRepository.writeKey(_enableAuth.value, _enableCmac.value)) {
            is NfcScanResult.Write -> _result.emit(NfcDebugScanResult.WriteSuccess)
            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun writeProtect(enable: Boolean) {
        when (val res = nfcRepository.writeProtect(enable, _enableAuth.value, _enableCmac.value)) {
            is NfcScanResult.Write -> _result.emit(NfcDebugScanResult.WriteSuccess)
            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun writeCmac(enable: Boolean) {
        when (val res = nfcRepository.writeCmac(enable, _enableAuth.value, _enableCmac.value)) {
            is NfcScanResult.Write -> _result.emit(NfcDebugScanResult.WriteSuccess)
            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun test() {
        when (val res = nfcRepository.test()) {
            is NfcScanResult.Test -> _result.emit(NfcDebugScanResult.Test(res.log))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    fun setAuth(enable: Boolean) {
        _enableAuth.update { enable }
    }

    fun setCmac(enable: Boolean) {
        _enableCmac.update { enable }
    }
}

data class NfcDebugViewUiState(
    val enableAuth: Boolean = false,
    val enableCmac: Boolean = false,
    val result: NfcDebugScanResult = NfcDebugScanResult.None
)

sealed interface NfcDebugScanResult {
    object None : NfcDebugScanResult
    data class ReadSuccess(
        val protected: Boolean,
        val uid: ULong,
        val content: String
    ) : NfcDebugScanResult

    object WriteSuccess : NfcDebugScanResult
    data class Failure(
        val reason: NfcScanFailure
    ) : NfcDebugScanResult

    data class Test(
        val log: List<Pair<String, Boolean>>
    ) : NfcDebugScanResult
}