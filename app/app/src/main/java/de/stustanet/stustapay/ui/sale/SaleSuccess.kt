package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle


@Composable
fun SaleSuccess(viewModel: SaleViewModel, onConfirm: () -> Unit) {
    val saleCompleted by viewModel.saleCompleted.collectAsStateWithLifecycle()

    // so we have a regular variable..
    val completedSale = saleCompleted
    if (completedSale == null) {
        Text(
            text = "no completed sale information available",
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            fontSize = 20.sp
        )
        return
    }

    val haptic = LocalHapticFeedback.current

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
                            .size(size = 40.dp)
                            .clip(shape = CircleShape)
                            .padding(top = 2.dp),
                        contentDescription = "Success!",
                    )

                    Row {
                        Text("Cost: ", fontSize = 24.sp)
                        SalePrice(completedSale.total_price)
                    }

                    Row {
                        Text("Money left: ", fontSize = 24.sp)
                        SalePrice(completedSale.new_balance)
                    }

                    if (completedSale.used_vouchers > 0) {
                        Row {
                            Text("Vouchers used: ${completedSale.used_vouchers}", fontSize = 20.sp)
                        }
                    }

                    if (completedSale.new_voucher_balance > 0) {
                        Row {
                            Text(
                                "Vouchers left: ${completedSale.new_voucher_balance}",
                                fontSize = 20.sp
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onConfirm()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(70.dp)
                    .padding(10.dp)
            ) {
                Text(text = "Done")
            }
        }
    )
}
