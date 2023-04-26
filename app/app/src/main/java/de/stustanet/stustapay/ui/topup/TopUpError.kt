package de.stustanet.stustapay.ui.topup

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun TopUpError(
    onDismiss: () -> Unit,
    viewModel: DepositViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.topUpConfig.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(topUpConfig.tillName) })
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
                        imageVector = Icons.Filled.Warning,
                        modifier = Modifier
                            .size(size = 60.dp)
                            .padding(top = 2.dp),
                        contentDescription = "Error!",
                        colorFilter = ColorFilter.tint(MaterialTheme.colors.onError),
                    )

                    Text(text = "Error in TopUp:", fontSize = 30.sp)

                    Text(status, fontSize = 24.sp)
                }
            }
        },
        bottomBar = {
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
                Text(text = "Back")
            }
        }
    )
}