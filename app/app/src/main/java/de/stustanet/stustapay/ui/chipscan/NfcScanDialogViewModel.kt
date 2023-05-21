package de.stustanet.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.repository.NfcRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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
    val scanTag: UserTag? = null,
)


@HiltViewModel
class NfcScanDialogViewModel @Inject constructor(
    private val nfcRepository: NfcRepository
) : ViewModel() {
    private val _scanState = MutableStateFlow<NfcScanUiState>(NfcScanUiState.None)

    private var scanJob: Job? = null

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
                    NfcScanState(
                        status = "Scan success!",
                        scanTag = UserTag(uid = scanResult.uid),
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
        if (scanJob?.isActive == true) {
            scanJob?.cancel()
        }

        scanJob = viewModelScope.launch {
            _scanState.update { NfcScanUiState.Scan }
            var res = nfcRepository.read(auth = true, cmac = true)
            while (true) {
                when (res) {
                    is NfcScanResult.Read -> {
                        if (res.chipContent.startsWith(nfcRepository.tagContent)) {
                            _scanState.emit(NfcScanUiState.Success(res.chipUid))
                            break
                        } else {
                            _scanState.update { NfcScanUiState.Tampered }
                        }
                    }

                    is NfcScanResult.Fail -> when (val reason = res.reason) {
                        is NfcScanFailure.Other -> _scanState.update {
                            NfcScanUiState.Error(reason.msg)
                        }

                        is NfcScanFailure.Incompatible -> _scanState.update {
                            NfcScanUiState.Error(
                                reason.msg
                            )
                        }

                        is NfcScanFailure.Lost -> _scanState.update {
                            NfcScanUiState.Rescan(
                                reason.msg
                            )
                        }

                        is NfcScanFailure.Auth -> _scanState.update {
                            NfcScanUiState.Error(
                                reason.msg
                            )
                        }
                    }

                    else -> _scanState.update { NfcScanUiState.None }
                }

                res = nfcRepository.read(true, true)
            }
        }
    }

    fun stopScan() {
        if (scanJob?.isActive == true) {
            scanJob?.cancel()
        }

        _scanState.update { NfcScanUiState.None }
    }
}