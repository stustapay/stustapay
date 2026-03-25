package de.stustapay.stustapay.ui.payinout.payout

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.CompletedPayOut
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import java.time.OffsetDateTime
import java.util.UUID
import kotlin.math.abs
import kotlinx.coroutines.delay

@Preview
@Composable
private fun PreviewPayOutSuccessDialogContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        OperatorPanel(modifier = Modifier.fillMaxWidth(0.92f)) {
            PayOutSuccessDialogContent(
                completedPayOut = CompletedPayOut(
                    uuid = UUID.randomUUID(),
                    customerTagUid = 0.toBigInteger(),
                    amount = 13.37,
                    customerAccountId = 0.toBigInteger(),
                    oldBalance = 42.0,
                    newBalance = 28.63,
                    bookedAt = OffsetDateTime.now(),
                    cashierId = 0.toBigInteger(),
                    tillId = 0.toBigInteger(),
                ),
                onDismiss = {},
            )
        }
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun PayOutSuccessDialog(
    onDismiss: () -> Unit = {},
    completedPayOut: CompletedPayOut,
) {
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false,
        ),
    ) {
        LaunchedEffect(Unit) {
            vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                PayOutSuccessDialogContent(
                    completedPayOut = completedPayOut,
                    onDismiss = onDismiss,
                )
            }
        }
    }
}

@Composable
private fun PayOutSuccessDialogContent(
    completedPayOut: CompletedPayOut,
    onDismiss: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val paidOut = abs(completedPayOut.amount)
    var secondsLeft by remember { mutableIntStateOf(10) }

    LaunchedEffect(Unit) {
        repeat(9) {
            delay(1_000)
            secondsLeft--
        }
        delay(1_000)
        onDismiss()
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        OperatorStatePanel(
            title = stringResource(R.string.success),
            message = stringResource(R.string.payout_status_booked_successfully),
            success = true,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            OperatorMetricCard(
                label = stringResource(R.string.previous_balance),
                value = formatPayoutSuccessEuro(completedPayOut.oldBalance),
                modifier = Modifier.weight(1f),
            )
            OperatorMetricCard(
                label = stringResource(R.string.payout),
                value = formatPayoutSuccessEuro(paidOut),
                accent = true,
                modifier = Modifier.weight(1f),
            )
        }
        OperatorRailSummaryRow(
            label = stringResource(R.string.credit_left),
            value = formatPayoutSuccessEuro(completedPayOut.newBalance),
            accent = true,
        )
        OperatorActionButton(
            text = stringResource(R.string.payout_success_done_countdown, secondsLeft),
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onDismiss()
            },
        )
    }
}

private fun formatPayoutSuccessEuro(value: Double): String = "%.2f€".format(value)
