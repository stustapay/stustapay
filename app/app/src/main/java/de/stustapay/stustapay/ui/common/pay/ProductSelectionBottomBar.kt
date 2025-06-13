package de.stustapay.stustapay.ui.common.pay

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
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
fun PreviewSelection3BottomBar() {
    ProductSelectionBottomBar(
        status = { Text("stuff") },
        ready = true,
        onAbort = {},
        price = 0.0,
        paymentActions = listOf(
            PaymentAction(method = PaymentVariant.ssp, action = {}, enabled = true),
            PaymentAction(method = PaymentVariant.free, action = {}, enabled = true),
            PaymentAction(method = PaymentVariant.card, action = {}, enabled = true),
        ),
    )
}

@Preview
@Composable
fun PreviewSelection2BottomBar() {
    ProductSelectionBottomBar(
        status = { Text("stuff") },
        ready = true,
        onAbort = {},
        price = 0.0,
        paymentActions = listOf(
            PaymentAction(method = PaymentVariant.cash, action = {}, enabled = true),
            PaymentAction(method = PaymentVariant.card, action = {}, enabled = true),
        ),
    )
}

@Preview
@Composable
fun PreviewSelection1BottomBar() {
    ProductSelectionBottomBar(
        status = { Text("stuff") },
        ready = true,
        onAbort = {},
        price = 0.0,
        paymentActions = listOf(
            PaymentAction(method = PaymentVariant.ssp, action = {}, enabled = true),
        ),
    )
}

@Preview
@Composable
fun PreviewSelection0BottomBar() {
    ProductSelectionBottomBar(
        status = { Text("stuff") },
        ready = true,
        onAbort = {},
        price = 0.0,
        paymentActions = listOf(),
    )
}

enum class PaymentVariant {
    ssp,
    cash,
    free,
    card,
}

data class PaymentAction(
    val method: PaymentVariant,
    val action: () -> Unit,
    val enabled: Boolean,
)


@Composable
fun PaymentSelectionButton(
    modifier: Modifier = Modifier,
    action: PaymentAction?,
    textSize: TextUnit,
    singleMethod: Boolean = false,
) {
    val haptic = LocalHapticFeedback.current

    val text: String
    val enabled: Boolean
    val onClick: () -> Unit
    if (action == null) {
        text = stringResource(R.string.sale_no_pay_method)
        enabled = false
        onClick = {}
    } else {
        onClick = action.action

        if (singleMethod) {
            text = "✅"  // White heavy check mark
        } else {
            text = when (action.method) {
                PaymentVariant.ssp -> {
                    stringResource(R.string.sale_pay_stustapay)
                }

                PaymentVariant.free -> {
                    stringResource(R.string.sale_pay_free)
                }

                PaymentVariant.cash -> {
                    stringResource(R.string.sale_pay_cash)
                }

                PaymentVariant.card -> {
                    stringResource(R.string.sale_pay_card)
                }
            }
        }
    }

    Button(
        enabled = action?.enabled == true,
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        },
        modifier = modifier
            .padding(start = 5.dp)
    ) {
        Text(
            text = text,
            fontSize = if (action == null) 12.sp else textSize,
            textAlign = TextAlign.Center,
            style = LargeButtonStyle
        )
    }
}


@Composable
fun ProductSelectionBottomBar(
    modifier: Modifier = Modifier,
    status: @Composable () -> Unit,
    ready: Boolean = true,
    onAbort: () -> Unit,
    // WASTEBASKET symbol
    abortText: String = "\uD83D\uDDD1",
    abortSize: TextUnit = 24.sp,
    submitSize: TextUnit = 30.sp,
    price: Double? = null,
    paymentActions: List<PaymentAction> = listOf(),
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
                name = stringResource(R.string.sale_history_sum),
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

        if (paymentActions.size <= 1) {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .height(55.dp),
            ) {
                Button(
                    enabled = ready, colors = errorButtonColors(), onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onAbort()
                    }, modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 70.dp)
                        .padding(end = 5.dp)
                ) {
                    Text(text = abortText, fontSize = abortSize)
                }

                PaymentSelectionButton(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 55.dp),
                    action = if (paymentActions.isEmpty()) {
                        null
                    } else {
                        paymentActions[0]
                    },
                    textSize = submitSize,
                    singleMethod = true,
                )
            }
        } else {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .height(100.dp)
            ) {
                for (action in paymentActions) {
                    PaymentSelectionButton(
                        modifier = Modifier.weight(1f),
                        action = action,
                        textSize = submitSize,
                    )
                }
            }

            Button(
                enabled = ready,
                colors = errorButtonColors(),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                }, modifier = Modifier
                    .heightIn(min = 60.dp)
                    .fillMaxWidth()
            ) {
                Text(text = abortText, fontSize = abortSize)
            }
        }
    }
}