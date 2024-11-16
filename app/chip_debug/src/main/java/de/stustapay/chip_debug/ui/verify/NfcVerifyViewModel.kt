package de.stustapay.chip_debug.ui.verify

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.chip_debug.repository.NfcRepository
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.model.NfcTag
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NfcVerifyViewModel @Inject constructor(
    private val nfcRepository: NfcRepository,
) : ViewModel() {
    private val _result = MutableStateFlow<NfcDebugScanResult>(NfcDebugScanResult.None)
    val result = _result.asStateFlow()

    private var job: Job? = null

    fun stop() {
        if (job?.isActive == true) {
            job?.cancel()
        }
        _result.update { NfcDebugScanResult.None }
    }

    fun scan(vibrator: Vibrator) {
        stop()

        job = viewModelScope.launch {
            val trying = true
            while (trying) {
                val res = nfcRepository.read()
                when (res) {
                    is NfcScanResult.Read -> {
                        vibrator.vibrate(VibrationEffect.createOneShot(300, 200))
                        _result.emit(
                            NfcDebugScanResult.ReadSuccess(
                                res.tag
                            )
                        )
                    }

                    is NfcScanResult.Fail -> _result.emit(NfcDebugScanResult.Failure(res.reason))
                    else -> _result.emit(NfcDebugScanResult.None)
                }
            }
        }
    }
}

sealed interface NfcDebugScanResult {
    object None : NfcDebugScanResult
    data class ReadSuccess(
        val tag: NfcTag
    ) : NfcDebugScanResult

    data class Failure(
        val reason: NfcScanFailure
    ) : NfcDebugScanResult
}