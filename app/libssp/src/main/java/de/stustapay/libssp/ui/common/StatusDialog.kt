package de.stustapay.libssp.ui.common


import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonColors
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.libssp.R
import de.stustapay.libssp.ui.theme.errorButtonColors

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
    onConfirm: () -> Unit = {},
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
    showConfirmButton: Boolean = true,
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                modifier = Modifier
                                    .padding(end = 5.dp)
                                    .size(size = 25.dp),
                                contentDescription = null,
                                tint = MaterialTheme.colors.surface
                            )
                            Text(
                                text = stringResource(R.string.common_back),
                                fontSize = 24.sp,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                }

                if (showConfirmButton) {
                    Button(
                        modifier = Modifier
                            .weight(1f, true),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onConfirm()
                        },
                        enabled = confirmEnabled,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Filled.Check,
                                modifier = Modifier
                                    .padding(end = 5.dp)
                                    .size(size = 25.dp),
                                contentDescription = null,
                                tint = MaterialTheme.colors.surface
                            )
                            Text(
                                text = stringResource(R.string.common_ok),
                                fontSize = 24.sp
                            )
                        }
                    }
                }
            }
        }
    }
}


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