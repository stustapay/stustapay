package de.stustanet.stustapay.ui.sale

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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem


@Composable
fun SaleSuccess(viewModel: SaleViewModel, onConfirm: () -> Unit) {
    val saleCompleted by viewModel.saleCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()

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

    val returnableCount = saleCompletedV.line_items.sumOf { i ->
        if (i.product.is_returnable) {
            i.quantity
        } else {
            0
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(saleConfig.tillName) })
        },
        content = { padding ->
            Box(
                modifier = Modifier
                    .padding(bottom = padding.calculateBottomPadding())
                    .padding(horizontal = 10.dp)
                    .fillMaxSize(),
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
                        price = saleCompletedV.total_price,
                        bigStyle = true,
                    )

                    ProductConfirmItem(
                        name = stringResource(R.string.new_balance),
                        price = saleCompletedV.new_balance,
                        bigStyle = true,
                    )

                    if (saleCompletedV.used_vouchers > 0 || saleCompletedV.new_voucher_balance > 0) {
                        Divider(modifier = Modifier.padding(bottom = 10.dp))

                        if (saleCompletedV.used_vouchers > 0) {
                            ProductConfirmItem(
                                name = stringResource(R.string.used_vouchers),
                                quantity = saleCompletedV.used_vouchers,
                            )
                        }

                        ProductConfirmItem(
                            name = stringResource(R.string.remaining_vouchers),
                            quantity = saleCompletedV.new_voucher_balance,
                        )
                    }

                    if (returnableCount != 0) {
                        Divider(modifier = Modifier.padding(bottom = 10.dp))

                        if (returnableCount > 0) {
                            ProductConfirmItem(
                                name = stringResource(R.string.deposit_handout),
                                quantity = returnableCount,
                            )
                        } else {
                            ProductConfirmItem(
                                name = stringResource(R.string.deposit_returned),
                                quantity = -returnableCount,
                            )
                        }
                    }
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
                Text(
                    text = status,
                    modifier = Modifier.fillMaxWidth(),
                    fontSize = 18.sp,
                    fontFamily = FontFamily.Monospace,
                )

                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onConfirm()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp)
                ) {
                    Text(text = "Done")
                }
            }
        }
    )
}
