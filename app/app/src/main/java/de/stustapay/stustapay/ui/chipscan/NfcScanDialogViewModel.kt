package de.stustapay.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.util.ResourcesProvider
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.repository.NfcRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface NfcScanUiState {
    object None : NfcScanUiState

    object Scan : NfcScanUiState

    data class Success(
        val tag: NfcTag
    ) : NfcScanUiState

    data class Error(val msg: String) : NfcScanUiState
    data class Rescan(val msg: String) : NfcScanUiState
    object Tampered : NfcScanUiState
}

data class NfcScanState(
    val status: String = "",
)

internal data class NfcScanStep(
    val uiState: NfcScanUiState,
    val continueScanning: Boolean
)

internal fun reduceScanResult(result: NfcScanResult, transientGuidance: String): NfcScanStep {
    return when (result) {
        is NfcScanResult.FastRead -> NfcScanStep(NfcScanUiState.Success(result.tag), continueScanning = false)
        is NfcScanResult.Read -> NfcScanStep(NfcScanUiState.Success(result.tag), continueScanning = false)
        is NfcScanResult.Write -> NfcScanStep(NfcScanUiState.Error("result was 'write'"), continueScanning = false)
        is NfcScanResult.Fail -> when (val reason = result.reason) {
            is NfcScanFailure.NoKey -> NfcScanStep(NfcScanUiState.Error("no secret present"), continueScanning = false)
            is NfcScanFailure.Other -> NfcScanStep(NfcScanUiState.Error(reason.msg), continueScanning = false)
            is NfcScanFailure.Incompatible -> NfcScanStep(NfcScanUiState.Error(reason.msg), continueScanning = false)
            is NfcScanFailure.Lost -> NfcScanStep(NfcScanUiState.Rescan(transientGuidance), continueScanning = true)
            is NfcScanFailure.Auth -> NfcScanStep(NfcScanUiState.Error(reason.msg), continueScanning = false)
        }

        is NfcScanResult.Test -> NfcScanStep(NfcScanUiState.Error("result was 'test'"), continueScanning = false)
    }
}

internal fun scanStatusText(uiState: NfcScanUiState, getString: (Int) -> String): String {
    return when (uiState) {
        is NfcScanUiState.None -> getString(R.string.nfc_no_scan_active)
        is NfcScanUiState.Scan -> getString(R.string.nfc_waiting_for_tag)
        is NfcScanUiState.Success -> getString(R.string.nfc_scan_success)
        is NfcScanUiState.Error -> getString(R.string.nfc_error_reading_tag_s).format(uiState.msg)
        is NfcScanUiState.Rescan -> getString(R.string.nfc_try_again_s).format(uiState.msg)
        is NfcScanUiState.Tampered -> getString(R.string.nfc_signature_mismatch)
    }
}

@HiltViewModel
class NfcScanDialogViewModel @Inject constructor(
    private val nfcRepository: NfcRepository,
    private val resourcesProvider: ResourcesProvider,
) : ViewModel() {
    private val _scanState = MutableStateFlow<NfcScanUiState>(NfcScanUiState.None)

    private var scanJob: Job? = null

    private val _scanning = MutableStateFlow(false)
    val scanning = _scanning.asStateFlow()

    private val _scanResult = MutableStateFlow<NfcTag?>(null)
    val scanResult = _scanResult.asStateFlow()

    val scanState: StateFlow<NfcScanState> =
        _scanState.mapState(NfcScanState(), viewModelScope) { currentState ->
            if (currentState is NfcScanUiState.Success) {
                _scanResult.update { currentState.tag }
            }
            NfcScanState(
                status = scanStatusText(currentState) { id -> resourcesProvider.getString(id) },
            )
        }

    fun scan() {
        clearScan()

        scanJob = viewModelScope.launch {
            try {
                _scanning.update { true }
                _scanState.update { NfcScanUiState.Scan }
                var trying = true
                while (trying) {
                    val res = nfcRepository.read()
                    val nextStep = reduceScanResult(
                        res,
                        resourcesProvider.getString(R.string.nfc_rescan_hold_still),
                    )
                    _scanState.update { nextStep.uiState }
                    trying = nextStep.continueScanning
                }
            } finally {
                _scanning.update { false }
            }
        }
    }

    fun stopScan() {
        clearScan()
        _scanState.update { NfcScanUiState.None }
    }

    fun clearScan() {
        if (scanJob?.isActive == true) {
            scanJob?.cancel()
        }
        _scanResult.update { null }
    }
}
