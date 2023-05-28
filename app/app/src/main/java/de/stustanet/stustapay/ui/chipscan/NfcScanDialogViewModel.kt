package de.stustanet.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.repository.NfcRepository
import de.stustanet.stustapay.repository.ReadMode
import de.stustanet.stustapay.util.mapState
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
        val uid: ULong
    ) : NfcScanUiState

    data class Error(val msg: String) : NfcScanUiState
    data class Rescan(val msg: String) : NfcScanUiState
    object Tampered : NfcScanUiState
}


data class NfcScanState(
    val status: String = "",
)


@HiltViewModel
class NfcScanDialogViewModel @Inject constructor(
    private val nfcRepository: NfcRepository
) : ViewModel() {
    private val _scanState = MutableStateFlow<NfcScanUiState>(NfcScanUiState.None)

    private var scanJob: Job? = null

    private val _scanning = MutableStateFlow(false)
    val scanning = _scanning.asStateFlow()

    private val _scanResult = MutableStateFlow<UserTag?>(null)
    val scanResult = _scanResult.asStateFlow()

    val scanState: StateFlow<NfcScanState> =
        _scanState.mapState(NfcScanState(), viewModelScope) { scanResult ->
            when (scanResult) {
                is NfcScanUiState.None -> {
                    NfcScanState(
                        status = "No scan active.",
                    )
                }

                is NfcScanUiState.Scan -> {
                    NfcScanState(
                        status = "Waiting for tag...",
                    )
                }

                is NfcScanUiState.Success -> {
                    _scanResult.update { UserTag(uid = scanResult.uid) }
                    NfcScanState(
                        status = "Scan success!",
                    )
                }

                is NfcScanUiState.Error -> {
                    NfcScanState(
                        status = "Error reading tag: ${scanResult.msg}",
                    )
                }

                is NfcScanUiState.Rescan -> {
                    NfcScanState(
                        status = "Try again! ${scanResult.msg}",
                    )
                }

                is NfcScanUiState.Tampered -> {
                    NfcScanState(
                        status = "Signature mismatch!",
                    )
                }
            }
        }

    fun scan() {
        // if running, cancel old scan job
        clearScan()

        scanJob = viewModelScope.launch {
            try {
                _scanning.update { true }
                _scanState.update { NfcScanUiState.Scan }
                var trying = true
                while (trying) {
                    // perform fast read only (no content tamper check)
                    // cmac + auth enable
                    val res = nfcRepository.read(ReadMode.Fast)

                    when (res) {
                        is NfcScanResult.FastRead -> {
                            _scanState.update { NfcScanUiState.Success(res.chipUid) }
                            trying = false
                        }

                        // when fast = false, we read the chip content.
                        is NfcScanResult.Read -> {
                            if (res.chipContent.startsWith(nfcRepository.tagContent)) {
                                _scanState.update { NfcScanUiState.Success(res.chipUid) }
                                trying = false
                            } else {
                                _scanState.update { NfcScanUiState.Tampered }
                            }
                        }

                        is NfcScanResult.Write -> {
                            // we should never get this anyway since we wanted to read...
                            trying = false
                        }

                        is NfcScanResult.Fail -> when (val reason = res.reason) {
                            is NfcScanFailure.NoKey -> _scanState.update {
                                trying = false
                                NfcScanUiState.Error("no secret present")
                            }

                            is NfcScanFailure.Other -> _scanState.update {
                                NfcScanUiState.Error(reason.msg)
                            }

                            is NfcScanFailure.Incompatible -> _scanState.update {
                                NfcScanUiState.Error(
                                    reason.msg,
                                )
                            }

                            is NfcScanFailure.Lost -> _scanState.update {
                                NfcScanUiState.Rescan(
                                    reason.msg
                                )
                            }

                            is NfcScanFailure.Auth -> _scanState.update {
                                NfcScanUiState.Error(
                                    reason.msg,
                                )
                            }
                        }

                        is NfcScanResult.Test -> {
                            NfcScanUiState.Error("result was 'test'")
                            trying = false
                        }
                    }
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