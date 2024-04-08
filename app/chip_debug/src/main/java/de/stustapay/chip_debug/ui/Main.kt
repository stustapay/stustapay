package de.stustapay.chip_debug.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import de.stustapay.chip_debug.ui.root.RootView
import de.stustapay.libssp.ui.theme.Theme
import de.stustapay.libssp.util.SysUiController


@Preview(showBackground = true)
@Composable
fun Main(uictrl: SysUiController? = null) {
    Theme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colors.background
        ) {
            RootView(uictrl)
        }
    }
}