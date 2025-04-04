package de.stustapay.libssp.ui.theme


import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBars
import androidx.compose.material.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity

@Composable
fun StatusBarTheme(
    color: Color = MaterialTheme.colors.surface,
    heightProvider: () -> Int = calcStatusBarHeight(),
) {

    Canvas(Modifier.fillMaxSize()) {
        val gradientHeight = heightProvider().toFloat()
        val gradient = Brush.verticalGradient(
            colors = listOf(
                color.copy(alpha = 1f),
                color.copy(alpha = .8f),
                Color.Transparent
            ),
            startY = 0f,
            endY = gradientHeight,
        )
        drawRect(
            brush = gradient,
            size = Size(size.width, gradientHeight),
        )
    }
}

@Composable
private fun calcStatusBarHeight(): () -> Int {
    val statusBars = WindowInsets.statusBars
    val density = LocalDensity.current
    return { statusBars.getTop(density) }
}