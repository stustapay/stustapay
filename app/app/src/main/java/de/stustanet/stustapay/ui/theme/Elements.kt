package de.stustanet.stustapay.ui.theme

import androidx.compose.material.ButtonColors
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.MaterialTheme
import androidx.compose.runtime.Composable

@Composable
fun errorButtonColors(): ButtonColors {
    return ButtonDefaults.buttonColors(
        contentColor = MaterialTheme.colors.onError,
        backgroundColor = MaterialTheme.colors.error,
    )
}

@Composable
fun confirmButtonColors(): ButtonColors {
    return ButtonDefaults.buttonColors(
        contentColor = MaterialTheme.colors.onError,
        backgroundColor = MaterialTheme.colors.error,
    )
}

@Composable
fun okButtonColors(): ButtonColors {
    return ButtonDefaults.buttonColors(
        contentColor = MaterialTheme.colors.onError,
        backgroundColor = Ok
    )
}