package de.stustapay.stustapay.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import de.stustapay.stustapay.ui.root.RootView
import de.stustapay.stustapay.ui.root.RootWrapper
import de.stustapay.stustapay.ui.theme.Theme
import de.stustapay.stustapay.util.SysUiController


@Preview(showBackground = true)
@Composable
fun Main(uictrl: SysUiController? = null) {
    Theme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colors.background
        ) {
            RootWrapper {
                RootView(uictrl)
            }
        }
    }
}