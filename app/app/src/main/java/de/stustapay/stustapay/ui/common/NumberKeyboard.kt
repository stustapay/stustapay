package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.libssp.ui.theme.NumberKeyboardStyle

@Composable
fun NumberKeyboardButton(
    modifier: Modifier,
    text: String,
    onClick: () -> Unit,
) {
    val buttonHeight = 75.dp
    val buttonPadding = 5.dp
    val buttonContentStyle = NumberKeyboardStyle
    val buttonContentPadding = PaddingValues(
        horizontal = 8.dp,
        vertical = 2.dp,
    )

    Button(
        modifier = modifier
            .height(buttonHeight)
            .padding(buttonPadding),
        contentPadding = buttonContentPadding,
        onClick = onClick,
    ) {
        Text(text, style = buttonContentStyle)
    }
}


@Preview
@Composable
fun NumberKeyboard(
    onDigitEntered: (UInt) -> Unit = {},
    onClear: () -> Unit = {},
) {
    val haptic = LocalHapticFeedback.current

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        for (i in 0u..2u) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                for (j in 1u..3u) {
                    val nr = i * 3u + j
                    NumberKeyboardButton(
                        modifier = Modifier
                            .weight(1f, true),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onDigitEntered(nr)
                        },
                        text = nr.toString()
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            NumberKeyboardButton(
                modifier = Modifier
                    .weight(1f, true),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDigitEntered(0u)
                    onDigitEntered(0u)
                },
                text = "00",
            )
            NumberKeyboardButton(
                modifier = Modifier
                    .weight(1f, true),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDigitEntered(0u)
                },
                text = "0",
            )
            NumberKeyboardButton(
                modifier = Modifier
                    .weight(1f, true),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onClear()
                },
                text = "❌",
            )
        }
    }
}