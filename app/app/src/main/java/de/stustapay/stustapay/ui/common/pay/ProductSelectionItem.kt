package de.stustapay.stustapay.ui.common.pay


import android.widget.Button
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.ButtonColors
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.libssp.ui.theme.ProductButtonBigStyle
import de.stustapay.libssp.ui.theme.ProductButtonStyle
import de.stustapay.libssp.ui.theme.errorButtonColors


@Preview
@Composable
fun PreviewSelectionItem() {
    Column {
        ProductSelectionItem(
            itemPrice = "13,37€",
            itemAmount = "12",
            leftButtonText = "Mischgetränk (Weinzelt)",
            rightButtonText = "-",
        )
        ProductSelectionItem(
            itemPrice = "13,37€",
            itemAmount = "12",
            leftButtonText = "Robbenfutter",
            rightButtonText = "-",
        )
        ProductSelectionItem(
            itemPrice = "4",
            itemAmount = "12",
            leftButtonText = "Gutschein",
            rightButtonText = "-",
            itemAmountDelimiter = "/",
        )
    }
}


/**
 * Item with increment and decrement buttons.
 */
@Composable
fun ProductSelectionItem(
    itemPrice: String? = null,
    itemAmount: String? = null,
    itemAmountDelimiter: String = "×",
    leftButtonText: String,
    leftButtonStyle: TextStyle = ProductButtonStyle,
    leftButtonColors: ButtonColors = ButtonDefaults.buttonColors(),
    rightButtonText: String = "‒",
    rightButtonStyle: TextStyle = ProductButtonBigStyle,
    rightButtonColors: ButtonColors = errorButtonColors(),
    leftButtonPress: () -> Unit = {},
    rightButtonPress: () -> Unit = {},
    sameSizeButtons: Boolean = false,
) {
    val haptic = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .weight(0.35f)
                .padding(end = 4.dp),
            horizontalArrangement = Arrangement.End,
        ) {
            // TODO: highlight background if not 0

            Text(
                text = itemPrice ?: "",
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.65f),
                fontSize = 22.sp,
            )

            Text(
                text = if (itemAmount != null) "${itemAmountDelimiter}${itemAmount}" else "",
                textAlign = TextAlign.Right,
                modifier = Modifier.weight(0.35f),
                fontSize = 22.sp,
            )
        }

        Box(
            modifier = Modifier
                .weight(0.65f)
                .padding(vertical = 3.dp)
                .height(74.dp)
        ) {
            val innerPadding = PaddingValues(horizontal = 3.dp, vertical = 2.dp)
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier.fillMaxSize(),
            ) {
                Button(
                    contentPadding = innerPadding,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        leftButtonPress()
                    },
                    modifier = Modifier
                        .fillMaxWidth(
                            if (sameSizeButtons) {
                                0.6f
                            } else {
                                0.7f
                            }
                        )
                        .fillMaxHeight(),
                    colors = leftButtonColors
                ) {
                    Text(
                        text = leftButtonText,
                        style = leftButtonStyle,
                        textAlign = TextAlign.Center
                    )
                }
                Spacer(modifier = Modifier.padding(horizontal = 2.dp))

                Button(
                    contentPadding = innerPadding,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        rightButtonPress()
                    },
                    modifier = Modifier.fillMaxSize(),
                    colors = rightButtonColors
                ) {
                    Text(
                        text = rightButtonText,
                        style = rightButtonStyle,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}
