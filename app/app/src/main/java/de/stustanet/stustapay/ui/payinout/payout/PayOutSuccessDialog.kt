package de.stustanet.stustapay.ui.payinout.payout


import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import de.stustanet.stustapay.R
import de.stustanet.stustapay.model.CompletedPayOut
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem

@Preview
@Composable
fun PreviewCashOutSuccessDialog() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CashOutSuccessCard(
            onDismiss = {},
            completedPayOut = CompletedPayOut(
                uuid = "",
                customer_tag_uid = 0u,
                amount = -13.37,
                customer_account_id = 0,
                old_balance = 42.0,
                new_balance = 30.5,
                booked_at = "",
                cashier_id = 0,
                till_id = 0,
            )
        )
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun PayOutSuccessDialog(
    onDismiss: () -> Unit = {},
    completedPayOut: CompletedPayOut,
) {
    Dialog(
        onDismissRequest = {
            onDismiss()
        },
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        CashOutSuccessCard(
            modifier = Modifier.padding(horizontal = 10.dp),
            onDismiss = onDismiss,
            completedPayOut = completedPayOut,
        )
    }
}


@Composable
fun CashOutSuccessCard(
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit,
    completedPayOut: CompletedPayOut,
) {
    val haptic = LocalHapticFeedback.current

    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    Card(
        shape = RoundedCornerShape(10.dp),
        modifier = modifier
            .padding(0.dp, 50.dp)
            .fillMaxWidth(),
        elevation = 8.dp,
    ) {
        LaunchedEffect(Unit) {
            vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
        }

        Scaffold(
            topBar = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Divider(thickness = 2.dp)
                }
            },
            content = { paddingValues ->
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .padding(horizontal = 10.dp)
                        .fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Image(
                        imageVector = Icons.Filled.CheckCircle,
                        modifier = Modifier
                            .size(size = 120.dp)
                            .clip(shape = CircleShape)
                            .padding(top = 2.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colors.primary),
                        contentDescription = stringResource(R.string.success),
                    )
                    Spacer(modifier = Modifier.height(20.dp))
                    ProductConfirmItem(
                        name = stringResource(R.string.payout),
                        price = completedPayOut.amount,
                        bigStyle = true,
                    )
                    Divider(thickness = 2.dp)
                    ProductConfirmItem(
                        name = stringResource(R.string.credit_left),
                        price = completedPayOut.new_balance,
                    )

                    // TODO maybe show vouchers here
                }
            },
            bottomBar = {
                Divider(modifier = Modifier.padding(top = 15.dp))
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp)
                ) {
                    Text(text = stringResource(R.string.done))
                }
            }
        )
    }
}