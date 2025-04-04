package de.stustapay.stustapay.ui.payinout.payout

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
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
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.TagSelectedItem
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection


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
        content = { paddingValues ->
            Column(
                modifier = Modifier
                    .padding(paddingValues)
                    .padding(top = 5.dp)
                    .padding(horizontal = 10.dp)
            ) {
                TagSelectedItem(
                    tag = payout.tag,
                    onClear = onClear,
                )

                Text(
                    stringResource(R.string.sale_credit).format(payout.maxAmount),
                    style = MaterialTheme.typography.h5,
                )

                if (canPayOut) {
                    AmountSelection(
                        amount = amount,
                        onAmountUpdate = onAmountUpdate,
                        onClear = onAmountClear,
                        config = amountConfig
                    )
                } else {
                    Text(
                        stringResource(R.string.no_balance_for_payout),
                        style = MaterialTheme.typography.h4,
                    )
                }
            }
        },
        bottomBar = {
            Column(modifier = Modifier.padding(horizontal = 10.dp)) {
                Divider(modifier = Modifier.fillMaxWidth())
                StatusText(status)

                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 5.dp),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onPayout()
                    },
                    enabled = ready && canPayOut,
                ) {
                    Text(
                        // unicode "Coin"
                        stringResource(R.string.sale_payout_action), fontSize = 28.sp,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    )
}
