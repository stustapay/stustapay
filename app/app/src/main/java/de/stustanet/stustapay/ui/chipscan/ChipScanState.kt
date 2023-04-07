package de.stustanet.stustapay.ui.chipscan

import androidx.compose.runtime.*

@Stable
class ChipScanState() {
    private var open by mutableStateOf(false)
    private lateinit var viewModel: ChipScanViewModel

    fun setViewModel(viewModel: ChipScanViewModel) {
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
fun rememberChipScanState(): ChipScanState {
    return remember {
        ChipScanState()
    }
}