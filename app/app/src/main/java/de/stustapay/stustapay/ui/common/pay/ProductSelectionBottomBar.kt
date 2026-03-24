package de.stustapay.stustapay.ui.common.pay

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPalette

@Preview
@Composable
fun PreviewSelectionBottomBar() {
    ProductSelectionBottomBar(
        status = { Text(stringResource(R.string.operator_status_ready)) },
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
    price: Double? = null,
    sspEnabled: Boolean = true,
    cashEnabled: Boolean = false,
    cardEnabled: Boolean = false,
    cashierHasRegister: Boolean = false,
    amountIsPositive: Boolean = true,
) {
    val haptic = LocalHapticFeedback.current

    val paymentActions = buildList {
        if (sspEnabled) {
            add(
                SelectionAction(
                    label = stringResource(R.string.pay_stustapay),
                    enabled = ready,
                    onClick = onSubmitSsp,
                )
            )
        }
        if (cashEnabled) {
            add(
                SelectionAction(
                    label = stringResource(R.string.pay_cash),
                    enabled = ready && cashierHasRegister,
                    onClick = onSubmitCash,
                )
            )
        }
        if (cardEnabled) {
            add(
                SelectionAction(
                    label = stringResource(R.string.pay_card),
                    enabled = ready && amountIsPositive,
                    onClick = onSubmitCard,
                )
            )
        }
    }

    OperatorPanel(
        modifier = modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panelMuted,
        borderColor = OperatorPalette.panelBorder,
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (price != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = stringResource(R.string.history_sum),
                        color = OperatorPalette.subtitle,
                        fontSize = 18.sp,
                    )
                    Text(
                        text = "%.02f€".format(price),
                        color = OperatorPalette.title,
                        fontSize = 26.sp,
                    )
                }
            }

            status()

            if (paymentActions.isEmpty()) {
                SelectionActionButton(
                    text = stringResource(R.string.pay_no_payment_method_configured),
                    enabled = false,
                    emphasized = false,
                    onClick = {},
                )
            } else {
                paymentActions.forEach { action ->
                    SelectionActionButton(
                        text = action.label,
                        enabled = action.enabled,
                        emphasized = true,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            action.onClick()
                        },
                    )
                }
            }

            SelectionActionButton(
                text = stringResource(R.string.sale_clear_basket),
                enabled = ready,
                emphasized = false,
                destructive = true,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAbort()
                },
            )
        }
    }
}

private data class SelectionAction(
    val label: String,
    val enabled: Boolean,
    val onClick: () -> Unit,
)

@Composable
private fun SelectionActionButton(
    text: String,
    enabled: Boolean,
    emphasized: Boolean,
    destructive: Boolean = false,
    onClick: () -> Unit,
) {
    val backgroundColor = when {
        destructive -> Color(0xFFB91C1C)
        emphasized -> OperatorPalette.accent
        else -> OperatorPalette.pill
    }
    val contentColor = if (emphasized) OperatorPalette.accentText else Color.White

    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = backgroundColor,
            contentColor = contentColor,
            disabledBackgroundColor = OperatorPalette.panel,
            disabledContentColor = OperatorPalette.subtitle,
        ),
    ) {
        Text(
            text = text,
            color = contentColor,
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
        )
    }
}
