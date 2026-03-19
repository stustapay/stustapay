package de.stustapay.stustapay.ui.ticket

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem


@Composable
fun TicketSuccess(
    onConfirm: () -> Unit,
    viewModel: TicketViewModel
) {
    val saleCompleted by viewModel.saleCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    BackHandler {
        onConfirm()
    }

    // so we have a regular variable..
    val saleCompletedV = saleCompleted
    if (saleCompletedV == null) {
        Text(
            text = "no completed sale information present",
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            fontSize = 20.sp
        )
        return
    }

    val haptic = LocalHapticFeedback.current

    OperatorScaffold(
        title = config.title().title,
        subtitle = "Ticket sale completed successfully.",
        icon = Icons.Filled.CheckCircle,
        terminalLabel = "Complete",
        footerHint = status,
        footerSection = "Tickets",
        footerStatus = "Done",
        onBack = onConfirm,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
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

                    ProductConfirmItem(
                        name = stringResource(R.string.price),
                        price = saleCompletedV.totalPrice,
                        bigStyle = true,
                    )

                    ProductConfirmItem(
                        name = stringResource(R.string.tickets),
                        quantity = saleCompletedV.scannedTickets.size
                    )
                }
            }
            OperatorPrimaryButton(
                text = stringResource(R.string.done),
                icon = Icons.Filled.CheckCircle,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onConfirm()
                },
            )
        }
    }
}
