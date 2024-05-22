package de.stustapay.chip_debug.ui.test

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.chip_debug.repository.NfcRepository
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.model.NfcTag
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
                enableAuth = enableAuth, enableCmac = enableCmac, result = result
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = NfcDebugViewUiState()
        )

    suspend fun read() {
        when (val res = nfcRepository.read()) {
            is NfcScanResult.Read -> _result.emit(
                NfcDebugScanResult.ReadSuccess(
                    res.tag
                )
            )

            is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
            else -> _result.emit(NfcDebugScanResult.None)
        }
    }

    suspend fun write() {
        when (val res = nfcRepository.write()) {
            is NfcScanResult.Test -> _result.emit(NfcDebugScanResult.WriteSuccess)
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
        val tag: NfcTag
    ) : NfcDebugScanResult

    object WriteSuccess : NfcDebugScanResult
    data class Failure(
        val reason: NfcScanFailure
    ) : NfcDebugScanResult

    data class Test(
        val log: List<Pair<String, Boolean>>
    ) : NfcDebugScanResult
}