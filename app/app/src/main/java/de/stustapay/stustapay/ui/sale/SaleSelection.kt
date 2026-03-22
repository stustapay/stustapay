package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Icon
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorBackground
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import kotlinx.coroutines.launch
import kotlin.math.abs

private data class SaleBasketSummaryLine(
    val label: String,
    val value: String,
)

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleSelection(
    viewModel: SaleViewModel,
    leaveView: () -> Unit = {},
) {
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val compactHandheld = maxWidth < 760.dp
        val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
        val saleStatus by viewModel.saleStatus.collectAsStateWithLifecycle()
        val status by viewModel.status.collectAsStateWithLifecycle()
        val scope = rememberCoroutineScope()
        val config = saleConfig
        var totalPrice = 0.0
        var basketCount = 0
        val basketLines = if (config is SaleConfig.Ready) {
            buildSaleBasketSummary(config = config, saleStatus = saleStatus)
        } else {
            emptyList()
        }

        if (config is SaleConfig.Ready) {
            for (button in config.buttons) {
                if (saleStatus.buttonSelection[button.value.id] != null) {
                    when (val buttonStatus = saleStatus.buttonSelection[button.value.id]!!) {
                        is SaleItemAmount.FreePrice -> {
                            totalPrice += buttonStatus.price.toDouble() / 100.0
                            if (buttonStatus.price > 0u) {
                                basketCount += 1
                            }
                        }

                        is SaleItemAmount.FixedPrice -> {
                            basketCount += abs(buttonStatus.amount)
                            totalPrice += when (val price = button.value.price) {
                                is SaleItemPrice.FreePrice -> {
                                    buttonStatus.amount * (price.defaultPrice ?: 0.0)
                                }

                                is SaleItemPrice.FixedPrice -> {
                                    buttonStatus.amount * price.price
                                }

                                is SaleItemPrice.Returnable -> {
                                    buttonStatus.amount * (price.price ?: 0.0)
                                }
                            }
                        }
                    }
                }
            }
        }

        OperatorBackground {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                CompactSaleHeader(
                    onBack = leaveView,
                    compactHandheld = compactHandheld,
                    tillLabel = if (config is SaleConfig.Ready) config.tillName else null,
                )

                if (compactHandheld) {
                    if (config is SaleConfig.Ready &&
                        config.buttons.size == 1 &&
                        config.buttons.all { it.value.price is SaleItemPrice.FreePrice }
                    ) {
                        OperatorPanel(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            backgroundColor = OperatorPalette.panel,
                        ) {
                            SaleSelectionFreePrice(
                                buttonId = config.buttons.values.last().id,
                                modifier = Modifier.fillMaxSize(),
                                viewModel = viewModel,
                            )
                        }
                    } else {
                        SaleSelectionList(
                            modifier = Modifier.weight(1f),
                            viewModel = viewModel
                        )
                    }

                    CompactSaleBasketPanel(
                        compactHandheld = true,
                        basketCount = basketCount,
                        totalPrice = totalPrice,
                        basketLines = basketLines,
                        ready = config is SaleConfig.Ready,
                        sspEnabled = config is SaleConfig.Ready && config.till.enableSspPayment,
                        cashEnabled = config is SaleConfig.Ready && config.till.enableCashPayment,
                        cardEnabled = config is SaleConfig.Ready && config.till.enableCardPayment,
                        cashierHasRegister = config is SaleConfig.Ready && config.till.cashRegisterId != null,
                        amountIsPositive = totalPrice > 0.0,
                        onAbort = {
                            scope.launch {
                                viewModel.clearSale()
                            }
                        },
                        onSubmitSsp = {
                            scope.launch {
                                viewModel.checkSale()
                            }
                        },
                        onSubmitCash = {
                            scope.launch {
                                viewModel.checkSaleCash()
                            }
                        },
                        onSubmitCard = {
                            scope.launch {
                                viewModel.checkSaleCard()
                            }
                        },
                    )
                } else {
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val contentModifier = Modifier
                            .weight(1f)
                            .fillMaxSize()

                        if (config is SaleConfig.Ready &&
                            config.buttons.size == 1 &&
                            config.buttons.all { it.value.price is SaleItemPrice.FreePrice }
                        ) {
                            OperatorPanel(
                                modifier = contentModifier,
                                backgroundColor = OperatorPalette.panel,
                            ) {
                                SaleSelectionFreePrice(
                                    buttonId = config.buttons.values.last().id,
                                    modifier = Modifier.fillMaxSize(),
                                    viewModel = viewModel,
                                )
                            }
                        } else {
                            SaleSelectionList(
                                modifier = contentModifier,
                                viewModel = viewModel
                            )
                        }

                        CompactSaleBasketPanel(
                            modifier = Modifier
                                .width(308.dp)
                                .fillMaxSize(),
                            compactHandheld = false,
                            basketCount = basketCount,
                            totalPrice = totalPrice,
                            basketLines = basketLines,
                            ready = config is SaleConfig.Ready,
                            sspEnabled = config is SaleConfig.Ready && config.till.enableSspPayment,
                            cashEnabled = config is SaleConfig.Ready && config.till.enableCashPayment,
                            cardEnabled = config is SaleConfig.Ready && config.till.enableCardPayment,
                            cashierHasRegister = config is SaleConfig.Ready && config.till.cashRegisterId != null,
                            amountIsPositive = totalPrice > 0.0,
                            onAbort = {
                                scope.launch {
                                    viewModel.clearSale()
                                }
                            },
                            onSubmitSsp = {
                                scope.launch {
                                    viewModel.checkSale()
                                }
                            },
                            onSubmitCash = {
                                scope.launch {
                                    viewModel.checkSaleCash()
                                }
                            },
                            onSubmitCard = {
                                scope.launch {
                                    viewModel.checkSaleCard()
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CompactSaleHeader(
    onBack: () -> Unit,
    compactHandheld: Boolean,
    tillLabel: String?,
) {
    if (compactHandheld) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            color = OperatorPalette.panel,
            border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
            elevation = 0.dp,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CompactCircleButton(
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    backgroundColor = OperatorPalette.pill,
                    onClick = onBack,
                    size = 36.dp,
                )
                Text(
                    text = stringResource(R.string.sale_compact_title),
                    color = OperatorPalette.title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                if (!tillLabel.isNullOrBlank()) {
                    Text(
                        text = tillLabel,
                        color = OperatorPalette.subtitle,
                        fontSize = 13.sp,
                        maxLines = 1,
                    )
                }
            }
        }
        return
    }

    OperatorPanel(
        modifier = Modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panel,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Start,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CompactCircleButton(
                icon = Icons.AutoMirrored.Filled.ArrowBack,
                backgroundColor = OperatorPalette.pill,
                onClick = onBack,
                size = 40.dp,
            )
            Column {
                Text(
                    text = stringResource(R.string.sale_compact_title),
                    color = OperatorPalette.title,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                if (!tillLabel.isNullOrBlank()) {
                    Text(
                        text = tillLabel,
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun CompactSaleBasketPanel(
    modifier: Modifier = Modifier,
    compactHandheld: Boolean,
    basketCount: Int,
    totalPrice: Double,
    basketLines: List<SaleBasketSummaryLine>,
    ready: Boolean,
    sspEnabled: Boolean,
    cashEnabled: Boolean,
    cardEnabled: Boolean,
    cashierHasRegister: Boolean,
    amountIsPositive: Boolean,
    onAbort: () -> Unit,
    onSubmitSsp: () -> Unit,
    onSubmitCash: () -> Unit,
    onSubmitCard: () -> Unit,
) {
    val paymentActions = buildList {
        if (sspEnabled) {
            add(
                CompactPaymentAction(
                    stringResource(R.string.sale_review_and_pay),
                    ready,
                    onSubmitSsp,
                )
            )
        }
        if (cashEnabled) {
            add(CompactPaymentAction("Cash", ready && cashierHasRegister, onSubmitCash))
        }
        if (cardEnabled) {
            add(CompactPaymentAction("Card", ready && amountIsPositive, onSubmitCard))
        }
    }

    OperatorPanel(
        modifier = modifier,
        backgroundColor = OperatorPalette.panelMuted,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(if (compactHandheld) 8.dp else 10.dp)) {
            if (!compactHandheld) {
                Text(
                    text = "Current order",
                    color = OperatorPalette.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                basketLines.take(6).forEach { line ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = line.label,
                            color = OperatorPalette.title,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            text = line.value,
                            color = OperatorPalette.title,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                if (basketLines.size > 6) {
                    Text(
                        text = "+${basketLines.size - 6} more",
                        color = OperatorPalette.subtitle,
                        fontSize = 13.sp,
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Total",
                    color = OperatorPalette.title,
                    fontSize = if (compactHandheld) 17.sp else 18.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = if (totalPrice == 0.0) "€0.00" else "€%.2f".format(totalPrice),
                    color = OperatorPalette.success,
                    fontSize = if (compactHandheld) 22.sp else 24.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            Text(
                text = "${basketCount} items",
                color = if (basketCount > 0) OperatorPalette.accent else OperatorPalette.subtitle,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )

            if (paymentActions.isEmpty()) {
                if (compactHandheld) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CompactActionButton(
                            text = "No payment method configured",
                            enabled = false,
                            emphasized = false,
                            modifier = Modifier.weight(1f),
                            onClick = {},
                        )
                        if (basketCount > 0) {
                            CompactCircleButton(
                                icon = Icons.Filled.Delete,
                                backgroundColor = Color(0xFF3A1D25),
                                tint = OperatorPalette.danger,
                                onClick = onAbort,
                                size = 34.dp,
                            )
                        }
                    }
                } else {
                    CompactActionButton(
                        text = "No payment method configured",
                        enabled = false,
                        emphasized = false,
                        onClick = {},
                    )
                    if (basketCount > 0) {
                        Text(
                            text = "Clear basket",
                            color = OperatorPalette.danger,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable(onClick = onAbort),
                        )
                    }
                }
            } else {
                val rows = paymentActions.chunked(if (paymentActions.size > 2) 2 else paymentActions.size)
                rows.forEachIndexed { index, actionRow ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        actionRow.forEach { action ->
                            CompactActionButton(
                                text = action.label,
                                enabled = action.enabled,
                                emphasized = true,
                                modifier = Modifier.weight(1f),
                                onClick = action.onClick,
                            )
                        }
                        repeat(2 - actionRow.size) {
                            Box(modifier = Modifier.weight(1f))
                        }
                        if (compactHandheld && index == 0 && basketCount > 0) {
                            CompactCircleButton(
                                icon = Icons.Filled.Delete,
                                backgroundColor = Color(0xFF3A1D25),
                                tint = OperatorPalette.danger,
                                onClick = onAbort,
                                size = 34.dp,
                            )
                        }
                    }
                }
                if (!compactHandheld && basketCount > 0) {
                    Text(
                        text = "Clear basket",
                        color = OperatorPalette.danger,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable(onClick = onAbort),
                    )
                }
            }
        }
    }
}

private fun buildSaleBasketSummary(
    config: SaleConfig.Ready,
    saleStatus: SaleStatus,
): List<SaleBasketSummaryLine> {
    val lines = mutableListOf<SaleBasketSummaryLine>()

    saleStatus.buttonSelection.forEach { (buttonId, amount) ->
        val button = config.buttons[buttonId] ?: return@forEach
        val label = button.caption.substringBefore("///")

        when (amount) {
            is SaleItemAmount.FixedPrice -> {
                if (amount.amount != 0) {
                    val unitPrice = when (val price = button.price) {
                        is SaleItemPrice.FixedPrice -> price.price
                        is SaleItemPrice.Returnable -> price.price ?: 0.0
                        is SaleItemPrice.FreePrice -> price.defaultPrice ?: 0.0
                    }
                    lines += SaleBasketSummaryLine(
                        label = "${amount.amount}x $label",
                        value = "€%.2f".format(amount.amount * unitPrice),
                    )
                }
            }

            is SaleItemAmount.FreePrice -> {
                if (amount.price > 0u) {
                    lines += SaleBasketSummaryLine(
                        label = label,
                        value = "€%.2f".format(amount.price.toDouble() / 100.0),
                    )
                }
            }
        }
    }

    val voucherAmount = saleStatus.voucherAmount
    if (voucherAmount != null && voucherAmount > 0) {
        lines += SaleBasketSummaryLine(
            label = "$voucherAmount ${if (voucherAmount == 1) "voucher" else "vouchers"}",
            value = "Applied",
        )
    }

    return lines
}

private data class CompactPaymentAction(
    val label: String,
    val enabled: Boolean,
    val onClick: () -> Unit,
)

@Composable
private fun CompactActionButton(
    text: String,
    enabled: Boolean,
    emphasized: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(46.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = if (emphasized) OperatorPalette.accent else OperatorPalette.pill,
            contentColor = if (emphasized) OperatorPalette.accentText else Color.White,
            disabledBackgroundColor = OperatorPalette.panel,
            disabledContentColor = OperatorPalette.subtitle,
        ),
    ) {
        Text(
            text = text,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun CompactCircleButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    backgroundColor: Color,
    tint: Color = OperatorPalette.title,
    onClick: () -> Unit,
    size: androidx.compose.ui.unit.Dp = 44.dp,
) {
    Box(
        modifier = Modifier
            .size(size)
            .background(backgroundColor, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
        )
    }
}
