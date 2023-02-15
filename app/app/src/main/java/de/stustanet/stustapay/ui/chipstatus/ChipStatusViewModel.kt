package de.stustanet.stustapay.ui.chipstatus

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.data.NfcState
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class ChipStatusViewModel @Inject constructor(
    nfcState: NfcState
) : ViewModel() {
    private val _uid = nfcState.uid

    val uiState: StateFlow<ChipStatusUiState> = _uid.map { uid ->
        ChipStatusUiState (
            uid = uid
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ChipStatusUiState(uid = 0uL)
    )
}

data class ChipStatusUiState(
    val uid: ULong = 0uL,
)