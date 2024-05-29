package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.R

@Composable
fun ErrorScreen(
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit,
    topBarTitle: String? = null,
    actuallyOk: Boolean = false,
    content: @Composable () -> Unit,
) {
    val haptic = LocalHapticFeedback.current

    Scaffold(
        topBar = {
            if (topBarTitle != null) {
                TopAppBar(title = { Text(topBarTitle) })
            }
        },
        content = { padding ->
            ErrorBox(
                modifier = modifier.padding(bottom = padding.calculateBottomPadding()),
                actuallyOk = actuallyOk,
                content = content
            )
        },
        bottomBar = {
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(70.dp)
                    .padding(10.dp)
            ) {
                Text(text = stringResource(R.string.back))
            }
        }
    )
}


@Preview
@Composable
fun PreviewErrorScreen() {
    ErrorScreen(onDismiss = { }) {
        Text("oh wow it went wrong sooo badly")
    }
}