package de.stustanet.stustapay.ui

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.data.NfcState
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class NavViewModel @Inject constructor(
    nfcState: NfcState
) : ViewModel() {
    private val _scanRequest = nfcState.scanRequest

    fun scan(req: Boolean) {
        _scanRequest.update { req }
    }
}