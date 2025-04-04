package de.stustapay.stustapay.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import de.stustapay.libssp.ui.theme.StatusBarTheme
import de.stustapay.libssp.ui.theme.Theme
import de.stustapay.libssp.util.SysUiController
import de.stustapay.stustapay.ui.root.RootView
import de.stustapay.stustapay.ui.root.RootWrapper


@Preview(showBackground = true)
@Composable
fun Main(uictrl: SysUiController? = null) {
    Theme {
        // https://developer.android.com/develop/ui/compose/layouts/insets
        Box(Modifier.safeDrawingPadding().fillMaxSize()) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colors.background
            ) {
                RootWrapper {
                    RootView(uictrl)
                }
            }
        }
        StatusBarTheme()
    }
}