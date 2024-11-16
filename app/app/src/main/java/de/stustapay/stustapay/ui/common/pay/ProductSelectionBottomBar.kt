package de.stustapay.stustapay.ui.common.pay

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.libssp.ui.theme.LargeButtonStyle
import de.stustapay.libssp.ui.theme.errorButtonColors
import de.stustapay.stustapay.R

@Preview
@Composable
fun PreviewSelectionBottomBar() {
    ProductSelectionBottomBar(
        status = { Text("stuff") },
        ready = true,
        onAbort = {},
        price = 0.0,
        sspEnabled = true,
        cashEnabled = true,
        cardEnabled = true,
    )
}

@Composable
fun ProductSelectionBottomBar(
    modifier: Modifier = Modifier,
    status: @Composable () -> Unit,
    ready: Boolean = true,
    onAbort: () -> Unit,
    onSubmitSsp: () -> Unit = {},
    onSubmitCash: () -> Unit = {},
    onSubmitCard: () -> Unit = {},
    // WASTEBASKET symbol
    abortText: String = "\uD83D\uDDD1",
    abortSize: TextUnit = 24.sp,
    submitText: String = "✓",
    submitSize: TextUnit = 30.sp,
    price: Double? = null,
    sspEnabled: Boolean = true,
    cashEnabled: Boolean = false,
    cardEnabled: Boolean = false,
    cashierHasRegister: Boolean = false,
) {
    val haptic = LocalHapticFeedback.current

    Column(
        modifier = modifier
            .padding(horizontal = 10.dp)
            .padding(bottom = 5.dp)
            .fillMaxWidth()
    ) {
        if (price != null) {
            Divider()
            ProductConfirmItem(
                name = stringResource(R.string.history_sum),
                price = price,
            )
            Divider()
        }

        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            modifier = Modifier.padding(vertical = 3.dp)
        ) {
            status()
        }

        // There are four cases to consider for the payment methods in terms of layout:
        // 0 enabled -> Layer 8 issue
        // 1 enabled -> Show custom confirmation text (single line)
        // 2 enabled -> Use symbols and long text
        // 3 enabled -> Use symbols and short text

        if (!sspEnabled && !cashEnabled && !cardEnabled) {
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
                    enabled = false,
                    onClick = {},
                    modifier = Modifier
                        .height(55.dp)
                        .fillMaxWidth()
                        .padding(start = 5.dp)
                ) {
                    Text(
                        text = stringResource(R.string.pay_no_payment_method_configured),
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        style = LargeButtonStyle
                    )
                }
            }
        } else if ((sspEnabled && !cashEnabled && !cardEnabled) ||
            (!sspEnabled && cashEnabled && !cardEnabled) ||
            (!sspEnabled && !cashEnabled && cardEnabled)
        ) {
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
                        if (sspEnabled) {
                            onSubmitSsp()
                        } else if (cashEnabled) {
                            onSubmitCash()
                        } else if (cardEnabled) {
                            onSubmitCard()
                        }
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
        } else if ((sspEnabled && cashEnabled && !cardEnabled) ||
            (!sspEnabled && cashEnabled && cardEnabled) ||
            (sspEnabled && !cashEnabled && cardEnabled)
        ) {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .height(100.dp)
            ) {
                Button(
                    enabled = ready && (sspEnabled || cashierHasRegister),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        if (sspEnabled) {
                            onSubmitSsp()
                        } else {
                            onSubmitCash()
                        }
                    },
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(0.5f)
                        .padding(horizontal = 5.dp)
                ) {
                    Text(
                        text = if (sspEnabled) {
                            stringResource(R.string.pay_stustapay)
                        } else {
                            stringResource(R.string.pay_cash)
                        },
                        fontSize = submitSize,
                        textAlign = TextAlign.Center,
                        style = LargeButtonStyle
                    )
                }

                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight()
                        .padding(horizontal = 5.dp),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        if (cardEnabled) {
                            onSubmitCard()
                        } else {
                            onSubmitCash()
                        }
                    },
                    enabled = ready && (cardEnabled || cashierHasRegister),
                ) {
                    Text(
                        text = if (cardEnabled) {
                            stringResource(R.string.pay_card)
                        } else {
                            stringResource(R.string.pay_cash)
                        },
                        textAlign = TextAlign.Center,
                        style = LargeButtonStyle,
                        fontSize = submitSize,
                    )
                }
            }

            Button(
                enabled = ready, colors = errorButtonColors(), onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                }, modifier = Modifier
                    .height(55.dp)
                    .fillMaxWidth()
            ) {
                Text(text = abortText, fontSize = abortSize)
            }
        } else {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .height(100.dp)
            ) {
                Button(
                    enabled = ready,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onSubmitSsp()
                    },
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(0.33f)
                        .padding(horizontal = 5.dp)
                ) {
                    Text(
                        text = stringResource(R.string.pay_stustapay),
                        fontSize = 25.sp,
                        textAlign = TextAlign.Center,
                        style = LargeButtonStyle
                    )
                }

                Button(
                    modifier = Modifier
                        .fillMaxWidth(0.5f)
                        .fillMaxHeight()
                        .padding(horizontal = 5.dp),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onSubmitCash()
                    },
                    enabled = ready && cashierHasRegister,
                ) {
                    Text(
                        stringResource(R.string.pay_cash),
                        textAlign = TextAlign.Center,
                        style = LargeButtonStyle,
                        fontSize = 25.sp,
                    )
                }

                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight()
                        .padding(horizontal = 5.dp),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onSubmitCard()
                    },
                    enabled = ready,
                ) {
                    Text(
                        stringResource(R.string.pay_card),
                        textAlign = TextAlign.Center,
                        style = LargeButtonStyle,
                        fontSize = 25.sp,
                    )
                }
            }

            Button(
                enabled = ready, colors = errorButtonColors(), onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                }, modifier = Modifier
                    .height(55.dp)
                    .fillMaxWidth()
            ) {
                Text(text = abortText, fontSize = abortSize)
            }
        }
    }
}