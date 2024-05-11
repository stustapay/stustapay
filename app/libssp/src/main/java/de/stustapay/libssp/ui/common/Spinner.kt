package de.stustapay.libssp.ui.common

import androidx.compose.material.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp


@Preview
@Composable
fun PreviewSpinner() {
    Spinner()
}


@Composable
fun Spinner(
    modifier: Modifier = Modifier,
) {
    val strokeWidth = 5.dp

    CircularProgressIndicator(
        modifier = modifier.drawBehind {
            drawCircle(
                Color.Blue,
                radius = size.width / 2 - strokeWidth.toPx() / 2,
                style = Stroke(strokeWidth.toPx())
            )
        },
        color = Color.LightGray,
        strokeWidth = strokeWidth
    )
}
