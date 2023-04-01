package de.stustanet.stustapay.ui.chipstatus

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcState
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import de.stustanet.stustapay.util.combine

@HiltViewModel
class ChipStatusViewModel @Inject constructor(
    nfcState: NfcState
) : ViewModel() {
    private val _scanRequest = nfcState.scanRequest
    private val _writeRequest = nfcState.writeRequest
    private val _protectRequest = nfcState.protectRequest
    private val _cmacRequest = nfcState.cmacRequest

    private val _cmacEnabled = nfcState.cmacEnabled
    private val _enableDebugCard = nfcState.enableDebugCard

    private val _chipDataReady = nfcState.chipDataReady
    private val _chipCompatible = nfcState.chipCompatible
    private val _chipAuthenticated = nfcState.chipAuthenticated
    private val _chipProtected = nfcState.chipProtected
    private val _chipUid = nfcState.chipUid
    private val _chipContent = nfcState.chipContent

    val uiState: StateFlow<ChipStatusUiState> = combine(
        _scanRequest,
        _writeRequest,
        _protectRequest,
        _cmacRequest,
        _cmacEnabled,
        _enableDebugCard,
        _chipDataReady,
        _chipCompatible,
        _chipAuthenticated,
        _chipProtected,
        _chipUid,
        _chipContent
    ) { scanRequest, writeRequest, protectRequest, cmacRequest, cmacEnabled, enableDebugCard, dataReady, compatible, authenticated, protected, uid, content ->
        ChipStatusUiState (
            scanRequest = scanRequest,
            writeRequest = writeRequest,
            protectRequest = protectRequest,
            cmacRequest = cmacRequest,
            cmacEnabled = cmacEnabled,
            enableDebugCard = enableDebugCard,
            dataReady = dataReady,
            compatible = compatible,
            authenticated = authenticated,
            protected = protected,
            uid = uid,
            content = content
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ChipStatusUiState()
    )

    fun scan(req: Boolean) {
        _scanRequest.update { req }
    }

    fun write(req: Boolean) {
        _writeRequest.update { req }
    }

    fun writeProtect(req: Boolean) {
        _protectRequest.update { req }
    }

    fun writeCmac(req: Boolean) {
        _cmacRequest.update { req }
    }

    fun cmac(req: Boolean) {
        _cmacEnabled.update { req }
    }

    fun debug(req: Boolean) {
        _enableDebugCard.update { req }
    }

    fun setContent(content: String) {
        _chipContent.update { content }
    }
}

data class ChipStatusUiState(
    val scanRequest: Boolean = false,
    val writeRequest: Boolean = false,
    val protectRequest: Boolean = false,
    val cmacRequest: Boolean = false,
    val cmacEnabled: Boolean = false,
    val enableDebugCard: Boolean = false,
    val dataReady: Boolean = false,
    val compatible: Boolean = false,
    val authenticated: Boolean = false,
    val protected: Boolean = false,
    val uid: ULong = 0uL,
    val content: String = ""
)