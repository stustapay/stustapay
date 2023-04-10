package de.stustanet.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.repository.NfcRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NfcScanDialogViewModel @Inject constructor(
    private val nfcRepository: NfcRepository
) : ViewModel() {
    private val _scanResult = MutableStateFlow<NfcScanDialogResult>(NfcScanDialogResult.None)

    val scanResult: StateFlow<NfcScanDialogUiState> = _scanResult.map { scanResult ->
        NfcScanDialogUiState(scanResult)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = NfcScanDialogUiState()
    )

    fun scan() {
        viewModelScope.launch {
            var res = nfcRepository.read(true, true)
            while (true) {
                when (res) {
                    is NfcScanResult.Read -> {
                        if (res.chipContent.startsWith("StuStaPay - built by SSN & friends!\nglhf ;)\n")) {
                            _scanResult.emit(NfcScanDialogResult.Success(res.chipUid))
                            break
                        } else {
                            _scanResult.emit(NfcScanDialogResult.Tampered)
                        }
                    }
                    is NfcScanResult.Fail -> when (res.reason) {
                        NfcScanFailure.Other -> _scanResult.emit(NfcScanDialogResult.None)
                        NfcScanFailure.Incompatible -> _scanResult.emit(NfcScanDialogResult.Incompatible)
                        NfcScanFailure.Lost -> _scanResult.emit(NfcScanDialogResult.Rescan)
                        NfcScanFailure.Auth -> _scanResult.emit(NfcScanDialogResult.Incompatible)
                    }
                    else -> _scanResult.emit(NfcScanDialogResult.None)
                }

                res = nfcRepository.read(true, true)
            }
        }
    }

    fun close() {
        viewModelScope.launch {
            _scanResult.emit(NfcScanDialogResult.None)
        }
    }
}

data class NfcScanDialogUiState(
    val result: NfcScanDialogResult = NfcScanDialogResult.None,
)

sealed interface NfcScanDialogResult {
    object None: NfcScanDialogResult
    data class Success(
        val uid: ULong
    ): NfcScanDialogResult
    object Incompatible: NfcScanDialogResult
    object Rescan: NfcScanDialogResult
    object Tampered: NfcScanDialogResult
}