package de.stustanet.stustapay.ui.common


import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonColors
import androidx.compose.material.Card
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.theme.errorButtonColors

@Preview
@Composable
fun PreviewStatusDialog() {
    Box(
        contentAlignment = Alignment.Center,
    ) {
        ConfirmCard(
            onConfirm = {},
            onBack = {},
        ) {
            Text("Do you want to save the world?", fontSize = 24.sp)
        }
    }
}


@Composable
fun DialogCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Card(
        shape = RoundedCornerShape(10.dp),
        modifier = modifier
            .padding(horizontal = 5.dp, vertical = 10.dp),
        elevation = 8.dp,
        content = content,
    )
}


@Composable
fun ConfirmCard(
    onConfirm: () -> Unit,
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
    showBackButton: Boolean = true,
    confirmEnabled: Boolean = true,
    backButtonColor: ButtonColors = errorButtonColors(),
    content: @Composable () -> Unit = {},
) {
    val haptic = LocalHapticFeedback.current

    DialogCard(modifier = modifier) {
        Column(
            modifier = Modifier
                .wrapContentHeight()
                .padding(10.dp),
        ) {
            content()

            Row(
                modifier = Modifier
                    .padding(top = 10.dp),
            ) {
                if (showBackButton) {
                    Button(
                        modifier = Modifier
                            .weight(1f, true),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onBack()
                        },
                        colors = backButtonColor,
                    ) {
                        // Leftwards arrow
                        Text(
                            text = stringResource(R.string.arrow_back),
                            fontSize = 24.sp,
                            textAlign = TextAlign.Center,
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                }

                Button(
                    modifier = Modifier
                        .weight(1f, true),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onConfirm()
                    },
                    enabled = confirmEnabled,
                ) {
                    Text(text = stringResource(R.string.check_ok), fontSize = 24.sp)
                }
            }
        }
    }
}