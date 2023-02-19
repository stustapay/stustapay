package de.stustanet.stustapay.ui.chipscan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcState
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class ChipScanViewModel @Inject constructor(
    nfcState: NfcState
) : ViewModel() {
    private val _scanRequest = nfcState.scanRequest
    private val _writeRequest = nfcState.writeRequest
    private val _protectRequest = nfcState.protectRequest

    private val _chipDataReady = nfcState.chipDataReady
    private val _chipCompatible = nfcState.chipCompatible
    private val _chipAuthenticated = nfcState.chipAuthenticated
    private val _chipProtected = nfcState.chipProtected
    private val _chipUid = nfcState.chipUid

    private var prevScanRequest = false
    private var prevWriteRequest = false
    private var prevProtectRequest = false

    val uiState: StateFlow<ChipScanUiState> = combine (
        _chipDataReady,
        _chipCompatible,
        _chipAuthenticated,
        _chipProtected,
        _chipUid
    ) { dataReady, compatible, authenticated, protected, uid ->
        ChipScanUiState (
            dataReady = dataReady,
            compatible = compatible,
            authenticated = authenticated,
            protected = protected,
            uid = uid
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ChipScanUiState(uid = 0uL)
    )

    fun scan() {
        prevScanRequest = _scanRequest.value
        prevWriteRequest = _writeRequest.value
        prevProtectRequest = _protectRequest.value

        _scanRequest.update { true }
        _writeRequest.update { false }
        _protectRequest.update { false }

        _chipDataReady.update { false }
        _chipCompatible.update { false }
        _chipAuthenticated.update { false }
        _chipProtected.update { false }
        _chipUid.update { 0uL }
    }

    fun close() {
        _scanRequest.update { prevScanRequest }
        _writeRequest.update { prevWriteRequest }
        _protectRequest.update { prevProtectRequest }

        _chipDataReady.update { false }
        _chipCompatible.update { false }
        _chipAuthenticated.update { false }
        _chipProtected.update { false }
        _chipUid.update { 0uL }
    }
}

data class ChipScanUiState(
    val dataReady: Boolean = false,
    val compatible: Boolean = false,
    val authenticated: Boolean = false,
    val protected: Boolean = false,
    val uid: ULong = 0uL
)