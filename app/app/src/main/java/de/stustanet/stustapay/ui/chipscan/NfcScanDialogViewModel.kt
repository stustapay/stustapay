package de.stustanet.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.repository.NfcRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject


sealed interface NfcScanDialogResult {
    object None : NfcScanDialogResult
    data class Success(
        val uid: ULong
    ) : NfcScanDialogResult

    data class Error(val msg: String) : NfcScanDialogResult
    data class Rescan(val msg: String) : NfcScanDialogResult
    object Tampered : NfcScanDialogResult
}


data class NfcScanDialogUiState(
    val action: String? = null,
    val status: String = "",
    val scanTag: UserTag? = null,
)


@HiltViewModel
class NfcScanDialogViewModel @Inject constructor(
    private val nfcRepository: NfcRepository
) : ViewModel() {
    private val _scanState = MutableStateFlow<NfcScanDialogResult>(NfcScanDialogResult.None)

    val scanState: StateFlow<NfcScanDialogUiState> =
        _scanState.mapState(NfcScanDialogUiState(), viewModelScope) { scanResult ->
            when (scanResult) {
                is NfcScanDialogResult.None -> {
                    NfcScanDialogUiState(
                        status = "Waiting for tag...",
                    )
                }
                is NfcScanDialogResult.Success -> {
                    NfcScanDialogUiState(
                        action = "Success!",
                        status = "",
                        scanTag = UserTag(uid = scanResult.uid),
                    )
                }
                is NfcScanDialogResult.Error -> {
                    NfcScanDialogUiState(
                        status = "Error reading tag: ${scanResult.msg}",
                    )
                }
                is NfcScanDialogResult.Rescan -> {
                    NfcScanDialogUiState(
                        status = "Try again! ${scanResult.msg}",
                    )
                }
                is NfcScanDialogResult.Tampered -> {
                    NfcScanDialogUiState(
                        status = "Signature mismatch!",
                    )
                }
            }
        }

    fun scan() {
        viewModelScope.launch {
            var res = nfcRepository.read(auth = true, cmac = true)
            while (true) {
                when (res) {
                    is NfcScanResult.Read -> {
                        if (res.chipContent.startsWith(nfcRepository.tagContent)) {
                            _scanState.emit(NfcScanDialogResult.Success(res.chipUid))
                            break
                        } else {
                            _scanState.update { NfcScanDialogResult.Tampered }
                        }
                    }
                    is NfcScanResult.Fail -> when (val reason = res.reason) {
                        NfcScanFailure.Other -> _scanState.update { NfcScanDialogResult.None }
                        is NfcScanFailure.Incompatible -> _scanState.update {
                            NfcScanDialogResult.Error(
                                reason.msg
                            )
                        }
                        is NfcScanFailure.Lost -> _scanState.update {
                            NfcScanDialogResult.Rescan(
                                reason.msg
                            )
                        }
                        is NfcScanFailure.Auth -> _scanState.update {
                            NfcScanDialogResult.Error(
                                reason.msg
                            )
                        }
                    }
                    else -> _scanState.update { NfcScanDialogResult.None }
                }

                res = nfcRepository.read(true, true)
            }
        }
    }

    fun close() {
        viewModelScope.launch {
            _scanState.emit(NfcScanDialogResult.None)
        }
    }
}