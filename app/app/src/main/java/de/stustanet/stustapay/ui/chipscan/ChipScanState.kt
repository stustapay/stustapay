package de.stustanet.stustapay.ui.chipscan

import androidx.compose.material.DrawerState
import androidx.compose.material.DrawerValue
import androidx.compose.material.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.remember

@Stable
class ChipScanState (
    private val _scan: () -> Unit,
    private val _close: () -> Unit,
    private val drawerState: DrawerState,
    var prompt: String = "Scan a chip"
) {
    suspend fun scan(prompt: String = "Scan a chip") {
        this.prompt = prompt
        _scan()
        drawerState.open()
    }

    suspend fun close() {
        _close()
        drawerState.close()
    }

    fun getDrawerState(): DrawerState {
        return drawerState
    }

    val isScanning: Boolean
        get() = drawerState.isOpen
}

@Composable
fun rememberChipScanState(
    scan: () -> Unit,
    close: () -> Unit,
    drawerState: DrawerState = rememberDrawerState(DrawerValue.Closed)
): ChipScanState = remember(drawerState) {
    ChipScanState(
        _scan = scan,
        _close = close,
        drawerState = drawerState
    )
}