package de.stustanet.stustapay.ui.debug

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.nfc.NfcDataSource
import de.stustanet.stustapay.repository.NfcRepository
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class NfcDebugViewModel @Inject constructor(
    private val nfcRepository: NfcRepository,
) : ViewModel() {
    private val _result = MutableStateFlow<NfcDebugScanResult>(NfcDebugScanResult.None)
    private val _enableAuth = MutableStateFlow(true)
    private val _enableCmac = MutableStateFlow(true)

    val uiState: StateFlow<NfcDebugViewUiState> = combine(_result, _enableAuth, _enableCmac) {
        result, enableAuth, enableCmac -> NfcDebugViewUiState(
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
        when (val res = nfcRepository.read(_enableAuth.value, _enableCmac.value)) {
            is NfcScanResult.Read -> _result.emit(NfcDebugScanResult.ReadSuccess(
                res.chipProtected,
                res.chipUid,
                res.chipContent
            ))
            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun program() {
        val requiresAuth = when (nfcRepository.read(false, false)) {
            is NfcScanResult.Read -> false
            else -> true
        }

        val requiresCmac = if (requiresAuth) {
            when (nfcRepository.read(true, false)) {
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
            is NfcScanResult.Read -> _result.emit(NfcDebugScanResult.ReadSuccess(
                res.chipProtected,
                res.chipUid,
                res.chipContent
            ))
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
    object None: NfcDebugScanResult
    data class ReadSuccess(
        val protected: Boolean,
        val uid: ULong,
        val content: String
    ): NfcDebugScanResult
    object WriteSuccess: NfcDebugScanResult
    data class Failure(
        val reason: NfcScanFailure
    ): NfcDebugScanResult
}