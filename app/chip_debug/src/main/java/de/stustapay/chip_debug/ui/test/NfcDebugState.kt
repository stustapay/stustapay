package de.stustapay.chip_debug.ui.test

import androidx.compose.runtime.*

@Stable
class NfcDebugState(private val viewModel: NfcDebugViewModel) {
    private var scanning by mutableStateOf(false)

    fun stop() {
        scanning = false
    }

    fun start() {
        scanning = true
    }

    fun isScanning(): Boolean {
        return scanning
    }
}

@Composable
fun rememberNfcDebugState(viewModel: NfcDebugViewModel): NfcDebugState {
    return remember {
        NfcDebugState(viewModel)
    }
}