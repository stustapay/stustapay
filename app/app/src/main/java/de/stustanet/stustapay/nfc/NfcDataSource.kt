package de.stustanet.stustapay.nfc

import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.util.BitVector
import de.stustanet.stustapay.util.asBitVector
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.*

@Singleton
class NfcDataSource @Inject constructor() {
    private val scanResult = MutableSharedFlow<NfcScanResult>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    private val readRequest = MutableSharedFlow<Unit>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    private val writeSigRequest = MutableSharedFlow<Unit>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    private val writeKeyRequest = MutableSharedFlow<Unit>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    private val writeProtectRequest = MutableSharedFlow<Boolean>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    private val writeCmacRequest = MutableSharedFlow<Boolean>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    val authKey = MutableStateFlow(ByteArray(16) { i -> i.toByte() }.asBitVector())
    val enableDebugCard = MutableStateFlow(false)
    val enableAuth = MutableStateFlow(true)
    val enableCmac = MutableStateFlow(true)

    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun read(): NfcScanResult {
        readRequest.emit(Unit)
        scanResult.resetReplayCache()
        return scanResult.first()
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun writeSig(): NfcScanResult {
        writeSigRequest.emit(Unit)
        scanResult.resetReplayCache()
        return scanResult.first()
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun writeKey(): NfcScanResult {
        writeKeyRequest.emit(Unit)
        scanResult.resetReplayCache()
        return scanResult.first()
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun writeProtect(enable: Boolean): NfcScanResult {
        writeProtectRequest.emit(enable)
        scanResult.resetReplayCache()
        return scanResult.first()
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun writeCmac(enable: Boolean): NfcScanResult {
        writeCmacRequest.emit(enable)
        scanResult.resetReplayCache()
        return scanResult.first()
    }

    fun emitScanRead(chipCompatible: Boolean, chipAuthenticated: Boolean, chipProtected: Boolean, chipUid: ULong, chipContent: String) {
        scanResult.tryEmit(NfcScanResult.Read(chipCompatible, chipAuthenticated, chipProtected, chipUid, chipContent))
    }

    fun emitScanWrite() {
        scanResult.tryEmit(NfcScanResult.Write)
    }

    fun emitScanFailure() {
        scanResult.tryEmit(NfcScanResult.Failed)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun isReadRequest(): Unit? {
        return if (readRequest.replayCache.isNotEmpty()) {
            readRequest.resetReplayCache()
        } else {
            null
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun isWriteSigRequest(): Unit? {
        return if (writeSigRequest.replayCache.isNotEmpty()) {
            writeSigRequest.resetReplayCache()
        } else {
            null
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun isWriteKeyRequest(): Unit? {
        return if (writeKeyRequest.replayCache.isNotEmpty()) {
            writeKeyRequest.resetReplayCache()
        } else {
            null
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun isWriteProtectRequest(): Boolean? {
        return if (writeProtectRequest.replayCache.isNotEmpty()) {
            val ret = writeProtectRequest.replayCache.first()
            writeProtectRequest.resetReplayCache()
            ret
        } else {
            null
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun isWriteCmacRequest(): Boolean? {
        return if (writeCmacRequest.replayCache.isNotEmpty()) {
            val ret = writeCmacRequest.replayCache.first()
            writeCmacRequest.resetReplayCache()
            ret
        } else {
            null
        }
    }

    fun getAuthKey(): BitVector {
        return authKey.value
    }

    fun isDebugCard(): Boolean {
        return enableDebugCard.value
    }

    fun isAuth(): Boolean {
        return enableAuth.value
    }

    fun isCmac(): Boolean {
        return enableCmac.value
    }
}