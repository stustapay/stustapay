package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.Button
import androidx.compose.material.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.stustapay.libssp.ui.theme.errorButtonColors


@Composable
fun CloseContent(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {

    Box(
        modifier = modifier,
        contentAlignment = Alignment.TopEnd
    ) {
        content()

        Button(
            onClick = onClose,
            colors = errorButtonColors(),
            modifier = Modifier
                .width(80.dp)
                .padding(10.dp),
        ) {
            Icon(Icons.Filled.Clear, "close")
        }
    }
}