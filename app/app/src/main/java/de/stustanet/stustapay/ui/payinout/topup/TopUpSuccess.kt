package de.stustanet.stustapay.ui.payinout.topup

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.StatusText

@Composable
fun TopUpSuccess(onDismiss: () -> Unit, viewModel: TopUpViewModel) {
    val topUpCompleted by viewModel.topUpCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    // so we have a regular variable..
    val completedTopUp = topUpCompleted
    if (completedTopUp == null) {
        Text(
            text = "no completed TopUp information available",
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            fontSize = 20.sp
        )
        return
    }

    LaunchedEffect(Unit) {
        vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
    }

    Scaffold(
        content = { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = padding.calculateBottomPadding()),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
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

                    TopUpConfirmItem(
                        name = stringResource(R.string.previous_balance),
                        price = completedTopUp.old_balance,
                    )
                    TopUpConfirmItem(
                        name = stringResource(R.string.topup),
                        price = completedTopUp.amount,
                    )

                    Divider(modifier = Modifier.padding(vertical = 10.dp))

                    TopUpConfirmItem(
                        name = stringResource(R.string.new_balance),
                        price = completedTopUp.new_balance,
                        bigStyle = true,
                    )
                }
            }
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp)
                    .fillMaxWidth()
            ) {
                Divider(modifier = Modifier.padding(top = 10.dp))
                StatusText(
                    status = status,
                    modifier = Modifier.fillMaxWidth(),
                )

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
        }
    )
}