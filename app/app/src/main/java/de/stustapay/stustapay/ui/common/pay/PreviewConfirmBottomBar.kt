package de.stustapay.stustapay.ui.common.pay

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.libssp.ui.theme.LargeButtonStyle
import de.stustapay.libssp.ui.theme.errorButtonColors

@Preview
@Composable
fun PreviewConfirmBottomBar() {
    ProductConfirmBottomBar(
        status = { Text("stuff") },
        ready = true,
        onAbort = {},
        onSubmit = {}
    )
}

@Composable
fun ProductConfirmBottomBar(
    modifier: Modifier = Modifier,
    status: @Composable () -> Unit,
    ready: Boolean = true,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
    // WASTEBASKET symbol
    abortText: String = "\uD83D\uDDD1",
    abortSize: TextUnit = 24.sp,
    submitText: String = "✓",
    submitSize: TextUnit = 30.sp,
) {
    val haptic = LocalHapticFeedback.current

    Column(
        modifier = modifier
            .padding(horizontal = 10.dp)
            .padding(bottom = 5.dp)
            .fillMaxWidth()
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            modifier = Modifier.padding(vertical = 3.dp)
        ) {
            status()
        }

        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            modifier = Modifier
                .padding(vertical = 10.dp)
        ) {
            Button(
                enabled = ready, colors = errorButtonColors(), onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                }, modifier = Modifier
                    .height(55.dp)
                    .fillMaxWidth(0.5f)
                    .padding(end = 5.dp)
            ) {
                Text(text = abortText, fontSize = abortSize)
            }

            Button(
                enabled = ready,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onSubmit()
                },
                modifier = Modifier
                    .height(55.dp)
                    .fillMaxWidth()
                    .padding(start = 5.dp)
            ) {
                Text(
                    text = submitText,
                    fontSize = submitSize,
                    textAlign = TextAlign.Center,
                    style = LargeButtonStyle
                )
            }
        }
    }
}