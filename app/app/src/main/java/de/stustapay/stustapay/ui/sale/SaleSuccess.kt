package de.stustapay.stustapay.ui.sale

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.SuccessIcon
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem


@Composable
fun SaleSuccess(viewModel: SaleViewModel, onConfirm: () -> Unit) {
    val saleCompleted by viewModel.saleCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val config = saleConfig

    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

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

    val returnableCount = saleCompletedV.lineItems.sumOf { i ->
        if (i.product.isReturnable) {
            i.quantity.intValue()
        } else {
            0
        }
    }

    LaunchedEffect(Unit) {
        vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
    }

    Scaffold(
        topBar = {
            TopAppBar(title = {
                if (config is SaleConfig.Ready) {
                    Text(config.tillName)
                } else {
                    Text("No Till")
                }
            })
        },
        content = { padding ->
            Box(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    SuccessIcon(modifier = Modifier.size(120.dp))

                    ProductConfirmItem(
                        name = stringResource(R.string.price),
                        price = saleCompletedV.totalPrice,
                        bigStyle = true,
                    )

                    ProductConfirmItem(
                        name = stringResource(R.string.new_balance),
                        price = saleCompletedV.newBalance,
                        bigStyle = true,
                    )

                    if (saleCompletedV.usedVouchers > 0 || saleCompletedV.newVoucherBalance > 0) {
                        Divider(modifier = Modifier.padding(bottom = 10.dp))

                        if (saleCompletedV.usedVouchers > 0) {
                            ProductConfirmItem(
                                name = stringResource(R.string.used_vouchers),
                                quantity = saleCompletedV.usedVouchers.intValue(),
                            )
                        }

                        ProductConfirmItem(
                            name = stringResource(R.string.remaining_vouchers),
                            quantity = saleCompletedV.newVoucherBalance.intValue(),
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
