package de.stustanet.stustapay.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material.MaterialTheme
import androidx.compose.material.darkColors
import androidx.compose.material.lightColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView

private val DarkColorPalette = darkColors(
    primary = Color.Purple200,
    primaryVariant = Color.Purple700,
    secondary = Color.Teal200
)

private val LightColorPalette = lightColors(
    primary = Color.Purple500,
    primaryVariant = Color.Purple700,
    secondary = Color.Teal200

    // Other colors to override
    /*
    background = Color.White,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.Black,
    onBackground = Color.Black,
    onSurface = Color.Black,
    */
)

@Composable
fun Theme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) {
        DarkColorPalette
    } else {
        LightColorPalette
    }

    val view = LocalView.current
    SideEffect {
        val window = (view.context as Activity).window
        window.statusBarColor = colors.primaryVariant.toArgb()
        window.navigationBarColor = colors.primaryVariant.toArgb()
    }

    MaterialTheme(
        colors = colors,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}