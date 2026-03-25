package de.stustapay.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow

@Preview
@Composable
private fun PreviewPayOutConfirmDialogContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        OperatorPanel(modifier = Modifier.fillMaxWidth(0.92f)) {
            PayOutConfirmDialogContent(
                getAmount = { 4212u },
                status = { },
                onConfirm = {},
                onAbort = {},
            )
        }
    }
}

@Composable
fun PayOutConfirmDialog(
    state: DialogDisplayState,
    onConfirm: () -> Unit = {},
    onAbort: () -> Unit = {},
    getAmount: () -> UInt,
    status: @Composable () -> Unit = {},
) {
    if (!state.isOpen()) {
        return
    }

    Dialog(
        onDismissRequest = onAbort,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                PayOutConfirmDialogContent(
                    getAmount = getAmount,
                    status = status,
                    onConfirm = onConfirm,
                    onAbort = onAbort,
                )
            }
        }
    }
}

@Composable
private fun PayOutConfirmDialogContent(
    getAmount: () -> UInt,
    status: @Composable () -> Unit,
    onConfirm: () -> Unit,
    onAbort: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = stringResource(R.string.payed_to_user_q),
            color = OperatorPalette.title,
            fontSize = 28.sp,
            fontWeight = FontWeight.ExtraBold,
        )
        OperatorRailSummaryRow(
            label = stringResource(R.string.operator_selected_amount),
            value = formatPayoutConfirmEuros(getAmount()),
            accent = true,
        )
        Box(modifier = Modifier.fillMaxWidth()) {
            status()
        }
        OperatorActionButton(
            text = stringResource(R.string.check_ok),
            onClick = onConfirm,
        )
        OperatorActionButton(
            text = stringResource(R.string.arrow_back),
            onClick = onAbort,
            primary = false,
        )
    }
}

private fun formatPayoutConfirmEuros(cents: UInt): String =
    "%.2f€".format(cents.toDouble() / 100.0)
