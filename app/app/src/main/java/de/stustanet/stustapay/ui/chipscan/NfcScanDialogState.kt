package de.stustanet.stustapay.ui.chipscan

import androidx.compose.runtime.*

@Stable
class NfcScanDialogState() {
    private var open by mutableStateOf(false)
    private lateinit var viewModel: NfcScanDialogViewModel

    fun setViewModel(viewModel: NfcScanDialogViewModel) {
        this.viewModel = viewModel
    }

    fun close() {
        open = false
        viewModel.close()
    }

    fun open() {
        open = true
        viewModel.scan()
    }

    fun isOpen(): Boolean {
        return open
    }
}

@Composable
fun rememberNfcScanDialogState(): NfcScanDialogState {
    return remember {
        NfcScanDialogState()
    }
}