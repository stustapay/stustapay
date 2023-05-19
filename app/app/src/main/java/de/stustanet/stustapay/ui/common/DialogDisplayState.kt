package de.stustanet.stustapay.ui.common

import androidx.compose.runtime.*


@Stable
class DialogDisplayState {
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
fun rememberDialogDisplayState(initiallyOpen: Boolean = false): DialogDisplayState {
    return remember {
        val ret = DialogDisplayState()
        if (initiallyOpen) {
            ret.open()
        }
        ret
    }
}