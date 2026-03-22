package de.stustapay.stustapay.ui.sale

import android.graphics.Bitmap
import android.graphics.Color
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.util.formatCurrencyValue
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import kotlinx.coroutines.delay

@Composable
fun SaleSuccess(
    viewModel: SaleViewModel,
    onConfirm: () -> Unit,
) {
    val saleCompleted by viewModel.saleCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val config = saleConfig
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    val completedSale = saleCompleted ?: return
    val paymentLabel = when (completedSale.paymentMethod) {
        PaymentMethod.cash -> stringResource(R.string.pay_cash).substringAfter('\n')
        PaymentMethod.sumup, PaymentMethod.sumup_online -> stringResource(R.string.pay_card).substringAfter('\n')
        PaymentMethod.tag -> stringResource(R.string.wristband)
    }
    val returnableCount = completedSale.lineItems.sumOf { lineItem ->
        if (lineItem.product.isReturnable) lineItem.quantity.intValue() else 0
    }

    LaunchedEffect(Unit) {
        vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
    }

    LaunchedEffect(completedSale) {
        delay(5000)
        onConfirm()
    }

    OperatorScaffold(
        title = if (config is SaleConfig.Ready) config.tillName else "No Till",
        subtitle = "Sale completed and ready for the next customer.",
        icon = Icons.Filled.CheckCircle,
        terminalLabel = "Complete",
        footerHint = status,
        footerSection = "Sale",
        footerStatus = "Done",
        onBack = onConfirm,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = { profile ->
                OperatorStatePanel(
                    title = stringResource(R.string.ticket_order_booked),
                    message = "Hand over the order and continue with the next basket.",
                    success = true,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(profile.gap),
                ) {
                    OperatorMetricCard(
                        label = stringResource(R.string.price),
                        value = formatCurrencyValue(completedSale.totalPrice),
                        accent = true,
                        modifier = Modifier.weight(1f),
                    )
                    if (completedSale.paymentMethod == PaymentMethod.tag) {
                        OperatorMetricCard(
                            label = stringResource(R.string.new_balance),
                            value = formatCurrencyValue(completedSale.newBalance),
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        OperatorMetricCard(
                            label = stringResource(R.string.operator_payment_method),
                            value = paymentLabel,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                if (completedSale.usedVouchers > 0 || completedSale.newVoucherBalance > 0 || returnableCount != 0) {
                    OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (completedSale.usedVouchers > 0) {
                                OperatorRailSummaryRow(
                                    label = stringResource(R.string.used_vouchers),
                                    value = completedSale.usedVouchers.intValue().toString(),
                                )
                            }
                            if (completedSale.newVoucherBalance > 0) {
                                OperatorRailSummaryRow(
                                    label = stringResource(R.string.remaining_vouchers),
                                    value = completedSale.newVoucherBalance.intValue().toString(),
                                )
                            }
                            if (returnableCount != 0) {
                                OperatorRailSummaryRow(
                                    label = if (returnableCount > 0) {
                                        stringResource(R.string.deposit_handout)
                                    } else {
                                        stringResource(R.string.deposit_returned)
                                    },
                                    value = kotlin.math.abs(returnableCount).toString(),
                                )
                            }
                        }
                    }
                }
            },
            railContent = {
                OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OperatorRailSummaryRow(
                            label = stringResource(R.string.operator_payment_method),
                            value = paymentLabel,
                        )
                        if (completedSale.paymentMethod == PaymentMethod.tag) {
                            OperatorRailSummaryRow(
                                label = stringResource(R.string.new_balance),
                                value = formatCurrencyValue(completedSale.newBalance),
                                accent = true,
                            )
                        }
                        OperatorActionButton(
                            text = "Next basket",
                            onClick = onConfirm,
                        )
                        if (completedSale.paymentMethod != PaymentMethod.tag && completedSale.bonUrl.isNotBlank()) {
                            ReceiptQrCard(receiptUrl = completedSale.bonUrl)
                        }
                    }
                }
            },
        )
    }
}

@Composable
private fun ReceiptQrCard(receiptUrl: String) {
    val hints = hashMapOf<EncodeHintType, Int>().also { it[EncodeHintType.MARGIN] = 1 }
    val qrCodeRaw = QRCodeWriter().encode(
        receiptUrl,
        BarcodeFormat.QR_CODE,
        320,
        320,
        hints,
    )
    val qrCodeBitmap = Bitmap.createBitmap(320, 320, Bitmap.Config.RGB_565).also { bitmap ->
        for (x in 0 until 320) {
            for (y in 0 until 320) {
                bitmap.setPixel(x, y, if (qrCodeRaw[x, y]) Color.BLACK else Color.WHITE)
            }
        }
    }

    OperatorPanel(backgroundColor = OperatorPalette.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            androidx.compose.material.Text(
                text = "Receipt QR",
                color = OperatorPalette.title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Image(
                bitmap = qrCodeBitmap.asImageBitmap(),
                contentDescription = "Receipt QR code",
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
