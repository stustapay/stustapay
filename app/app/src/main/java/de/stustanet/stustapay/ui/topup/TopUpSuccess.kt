package de.stustanet.stustapay.ui.topup

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar

@Composable
fun TopUpSuccess(onDismiss: () -> Unit, viewModel: DepositViewModel) {
    val topUpCompleted by viewModel.topUpCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.topUpConfig.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current

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

    Scaffold(
        topBar = {
            Column(modifier = Modifier.fillMaxWidth()) {
                TopAppBar(title = { Text(saleConfig.tillName) })
            }
        },
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
                        contentDescription = "Success!",
                    )

                    TopUpConfirmItem(
                        name = "Altes Guthaben",
                        price = completedTopUp.old_balance,
                        fontSize = 30.sp,
                    )
                    TopUpConfirmItem(
                        name = "Aufladung",
                        price = completedTopUp.amount,
                        fontSize = 30.sp,
                    )

                    Divider(modifier = Modifier.padding(vertical = 10.dp))

                    TopUpConfirmItem(
                        name = "Neues Guthaben",
                        price = completedTopUp.new_balance,
                        fontSize = 40.sp,
                    )
                }
            }
        },
        bottomBar = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Divider(modifier = Modifier.padding(top = 10.dp))
                Text(
                    text = status,
                    modifier = Modifier.fillMaxWidth(),
                    fontSize = 18.sp,
                    fontFamily = FontFamily.Monospace,
                )

                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp)
                        .padding(10.dp)
                ) {
                    Text(text = "Done")
                }
            }
        }
    )
}