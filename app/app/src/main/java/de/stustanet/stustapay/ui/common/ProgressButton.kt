package de.stustanet.stustapay.ui.common

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview

@Preview
@Composable
fun PreviewProgressButton() {
    ProgressButton(onClick = { }) {
        Text("Stuff")
    }
}


@Stable
class ProgressButtonState {
    private var _enabled = mutableStateOf(true)
    val enabled by _enabled

    fun enable() {
        _enabled.value = true
    }

    fun disable() {
        _enabled.value = false
    }
}


@Composable
fun rememberProgressButtonState(): ProgressButtonState {
    return remember {
        ProgressButtonState()
    }
}


@Composable
fun ProgressButton(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    state: ProgressButtonState = remember { ProgressButtonState() },
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding,
    content: @Composable () -> Unit
) {
    Button(
        modifier = modifier,
        enabled = state.enabled,
        contentPadding = contentPadding,
        onClick = {
            if (state.enabled) {
                state.disable()
                onClick()
            }
        },
    ) {
        if (state.enabled) {
            content()
        } else {
            Spinner()
        }
    }
}