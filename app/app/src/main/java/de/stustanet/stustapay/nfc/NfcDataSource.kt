package de.stustanet.stustapay.nfc

import de.stustanet.stustapay.model.NfcScanRequest
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
    private val scanRequest = MutableSharedFlow<NfcScanRequest>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    private val authKey = MutableStateFlow(ByteArray(16) { i -> i.toByte() }.asBitVector())

    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun scan(req: NfcScanRequest): NfcScanResult {
        while (scanRequest.replayCache.isNotEmpty()) {}
        scanRequest.emit(req)
        scanResult.resetReplayCache()
        val res = scanResult.first()
        scanRequest.resetReplayCache()
        return res
    }

    fun getScanRequest(): NfcScanRequest? {
        return if (scanRequest.replayCache.isNotEmpty()) {
            scanRequest.replayCache.first()
        } else {
            null
        }
    }

    fun setScanResult(res: NfcScanResult) {
        scanResult.tryEmit(res)
    }

    fun getAuthKey(): BitVector {
        return authKey.value
    }
}