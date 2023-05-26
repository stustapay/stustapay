package de.stustanet.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.TagSelectedItem
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.amountselect.AmountSelection


@Composable
fun PayOutSelection(
    status: String,
    payout: CheckedPayOut,
    amount: UInt,
    onAmountUpdate: (UInt) -> Unit,
    onAmountClear: () -> Unit,
    onClear: () -> Unit,
    amountConfig: AmountConfig.Money,
    ready: Boolean,
    onPayout: () -> Unit
) {
    val haptic = LocalHapticFeedback.current

    val canPayOut = payout.maxAmount >= 0.01

    Scaffold(
        bottomBar = {
            Column(modifier = Modifier.padding(20.dp)) {
                Divider(modifier = Modifier.fillMaxWidth())
                Text(status, fontSize = 24.sp)

                Row(
                    modifier = Modifier
                        .padding(top = 10.dp)
                        .fillMaxWidth()
                ) {
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(end = 10.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onPayout()
                        },
                        enabled = ready && canPayOut,
                    ) {
                        Text(
                            // unicode "Coin"
                            "\uD83E\uDE99 Auszahlen...", fontSize = 28.sp,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .padding(top = 15.dp)
                .padding(horizontal = 20.dp)
        ) {
            TagSelectedItem(
                tag = payout.tag,
                onClear = onClear,
            )

            Text(stringResource(R.string.credit_amount).format(payout.maxAmount), fontSize = 30.sp)

            if (canPayOut) {
                AmountSelection(
                    amount = amount,
                    onAmountUpdate = onAmountUpdate,
                    onClear = onAmountClear,
                    config = amountConfig
                )
            }
            else {
                Text("Kein Guthaben zum Auszahlen", fontSize = 26.sp)
            }
        }
    }
}
