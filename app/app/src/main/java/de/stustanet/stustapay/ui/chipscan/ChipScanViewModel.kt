package de.stustanet.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.repository.NfcRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChipScanViewModel @Inject constructor(
    private val nfcRepository: NfcRepository
) : ViewModel() {
    private val _scanResult = MutableStateFlow<NfcScanResult>(NfcScanResult.Failed)

    val uiState: StateFlow<ChipScanViewUiState> = _scanResult.map {
        when (it) {
            is NfcScanResult.Read -> ChipScanViewUiState(it.chipCompatible && it.chipAuthenticated && it.chipProtected, it.chipUid)
            is NfcScanResult.Write -> ChipScanViewUiState()
            is NfcScanResult.Failed -> ChipScanViewUiState()
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ChipScanViewUiState()
    )

    fun scan() {
        viewModelScope.launch {
            val res = nfcRepository.read()
            _scanResult.emit(res)
        }
    }

    fun close() {
        viewModelScope.launch {
            _scanResult.emit(NfcScanResult.Failed)
        }
    }
}

data class ChipScanViewUiState(
    val success: Boolean = false,
    val uid: ULong = 0uL
)