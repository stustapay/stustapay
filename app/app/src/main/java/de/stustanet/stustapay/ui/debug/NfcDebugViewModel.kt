package de.stustanet.stustapay.ui.debug

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.nfc.NfcDataSource
import de.stustanet.stustapay.repository.NfcRepository
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class NfcDebugViewModel @Inject constructor(
    private val nfcRepository: NfcRepository,
    nfcDataSource: NfcDataSource
) : ViewModel() {
    private val _enableDebugCard = nfcDataSource.enableDebugCard
    private val _enableAuth = nfcDataSource.enableAuth
    private val _enableCmac = nfcDataSource.enableCmac

    private val _scanResult = MutableStateFlow<NfcScanResult>(NfcScanResult.Failed)

    val uiState: StateFlow<NfcDebugViewUiState> = combine(_scanResult, _enableDebugCard, _enableAuth, _enableCmac) {
        scanResult, enableDebugCard, enableAuth, enableCmac -> when (scanResult) {
            is NfcScanResult.Read -> {
                NfcDebugViewUiState(
                    enableDebugCard = enableDebugCard,
                    enableAuth = enableAuth,
                    enableCmac = enableCmac,
                    compatible = scanResult.chipCompatible,
                    authenticated = scanResult.chipAuthenticated,
                    protected = scanResult.chipProtected,
                    uid = scanResult.chipUid,
                    content = scanResult.chipContent
                )
            }
            is NfcScanResult.Write -> {
                NfcDebugViewUiState(
                    enableDebugCard = enableDebugCard,
                    enableAuth = enableAuth,
                    enableCmac = enableCmac
                )
            }
            is NfcScanResult.Failed -> {
                NfcDebugViewUiState(
                    enableDebugCard = enableDebugCard,
                    enableAuth = enableAuth,
                    enableCmac = enableCmac
                )
            }
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = NfcDebugViewUiState()
    )

    suspend fun read() {
        val res = nfcRepository.read()
        _scanResult.emit(res)
    }

    suspend fun writeSig() {
        val res = nfcRepository.writeSig()
        _scanResult.emit(res)
    }

    suspend fun writeKey() {
        val res = nfcRepository.writeKey()
        _scanResult.emit(res)
    }

    suspend fun writeProtectOn() {
        val res = nfcRepository.writeProtect(true)
        _scanResult.emit(res)
    }

    suspend fun writeProtectOff() {
        val res = nfcRepository.writeProtect(false)
        _scanResult.emit(res)
    }

    suspend fun writeCmacOn() {
        val res = nfcRepository.writeCmac(true)
        _scanResult.emit(res)
    }

    suspend fun writeCmacOff() {
        val res = nfcRepository.writeCmac(false)
        _scanResult.emit(res)
    }

    fun setDebugCard(enable: Boolean) {
        _enableDebugCard.update { enable }
    }

    fun setAuth(enable: Boolean) {
        _enableAuth.update { enable }
    }

    fun setCmac(enable: Boolean) {
        _enableCmac.update { enable }
    }
}

data class NfcDebugViewUiState(
    val enableDebugCard: Boolean = false,
    val enableAuth: Boolean = false,
    val enableCmac: Boolean = false,

    val compatible: Boolean? = null,
    val authenticated: Boolean? = null,
    val protected: Boolean? = null,
    val uid: ULong? = null,
    val content: String? = null
)