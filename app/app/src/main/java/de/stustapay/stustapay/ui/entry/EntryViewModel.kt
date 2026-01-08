package de.stustapay.stustapay.ui.entry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.EntryDirection
import de.stustapay.api.models.EntryScanResult
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.ResourcesProvider
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.repository.EntryRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class EntryViewModel @Inject constructor(
    private val entryRepository: EntryRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val resourcesProvider: ResourcesProvider,
) : ViewModel() {

    private val _scanResult = MutableStateFlow<EntryScanResult?>(null)
    val scanResult = _scanResult.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _requestActive = MutableStateFlow(false)
    val requestActive = _requestActive.asStateFlow()

    private var clearJob: Job? = null
    private var scanCounter = 0

    val terminalLoginState = terminalConfigRepository.terminalConfigState.mapState(
        initialValue = TerminalLoginState(), scope = viewModelScope
    ) { terminal ->
        TerminalLoginState(terminal = terminal)
    }

    suspend fun tagScanned(tag: NfcTag) {
        if (_requestActive.value) {
            return
        }
        clearJob?.cancel()
        _requestActive.update { true }
        _status.update { resourcesProvider.getString(R.string.entry_status_processing) }

        when (val response = entryRepository.scanEntry(tag.uid)) {
            is Response.OK -> {
                _scanResult.update { response.data }
                _status.update { reasonToMessage(response.data.reason, response.data.direction) }
            }
            is Response.Error -> {
                _scanResult.update { null }
                _status.update { response.msg() }
            }
        }

        _requestActive.update { false }
        scheduleAutoClear()
    }

    private fun scheduleAutoClear() {
        val currentScan = ++scanCounter
        clearJob?.cancel()
        clearJob = viewModelScope.launch {
            delay(5000)
            if (currentScan == scanCounter) {
                _scanResult.update { null }
                _status.update { "" }
            }
        }
    }

    private fun reasonToMessage(reason: String, direction: EntryDirection): String {
        return when (reason) {
            "allowed" -> if (direction == EntryDirection.entry) {
                resourcesProvider.getString(R.string.entry_reason_allowed_entry)
            } else {
                resourcesProvider.getString(R.string.entry_reason_allowed_exit)
            }
            "already_inside" -> resourcesProvider.getString(R.string.entry_reason_already_inside)
            "not_inside" -> resourcesProvider.getString(R.string.entry_reason_not_inside)
            "not_in_group" -> resourcesProvider.getString(R.string.entry_reason_not_in_group)
            "outside_window" -> resourcesProvider.getString(R.string.entry_reason_outside_window)
            "unknown_tag" -> resourcesProvider.getString(R.string.entry_reason_unknown_tag)
            "terminal_wrong_mode" -> resourcesProvider.getString(R.string.entry_reason_terminal_wrong_mode)
            "terminal_not_configured" -> resourcesProvider.getString(R.string.entry_reason_terminal_not_configured)
            "area_not_found" -> resourcesProvider.getString(R.string.entry_reason_area_not_found)
            else -> reason
        }
    }
}
