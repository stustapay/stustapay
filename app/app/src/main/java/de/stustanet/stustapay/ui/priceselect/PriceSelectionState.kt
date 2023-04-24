package de.stustanet.stustapay.ui.priceselect

import androidx.compose.runtime.*


@Stable
class PriceSelectionState {
    private var open by mutableStateOf(false)

    fun close() {
        open = false
    }

    fun open() {
        open = true
    }

    fun isOpen(): Boolean {
        return open
    }
}

@Composable
fun rememberPriceSelectionState(initiallyOpen: Boolean = false): PriceSelectionState {
    return remember {
        val ret = PriceSelectionState()
        if (initiallyOpen) {
            ret.open()
        }
        ret
    }
}