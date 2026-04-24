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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorBackground
import de.stustapay.stustapay.ui.common.operator.OperatorCompactFlowHeader
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
                            compactHandheld = compactHandheld,
                            modifier = Modifier.weight(1f),
                            viewModel = viewModel
                        )
                    }

                    CompactSaleBasketPanel(
                        compactHandheld = true,
                        stackPaymentActions = true,
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
                                compactHandheld = compactHandheld,
                                modifier = contentModifier,
                                viewModel = viewModel
                            )
                        }

                        CompactSaleBasketPanel(
                            modifier = Modifier
                                .width(308.dp)
                                .fillMaxSize(),
                            compactHandheld = false,
                            stackPaymentActions = true,
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
    OperatorCompactFlowHeader(
        flowTitle = stringResource(R.string.sale_compact_title),
        tillLabel = tillLabel,
        onBack = onBack,
        compactHandheld = compactHandheld,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun CompactSaleBasketPanel(
    modifier: Modifier = Modifier,
    compactHandheld: Boolean,
    stackPaymentActions: Boolean,
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
                    if (totalPrice <= 0.0) {
                        stringResource(R.string.sale_book_credit)
                    } else {
                        stringResource(R.string.sale_review_and_pay)
                    },
                    ready && basketCount > 0,
                    onSubmitSsp,
                    large = true,
                )
            )
        }
        if (cardEnabled) {
            add(
                CompactPaymentAction(
                    stringResource(R.string.sale_ec_payment),
                    ready && amountIsPositive,
                    onSubmitCard,
                )
            )
        }
        if (cashEnabled) {
            add(
                CompactPaymentAction(
                    if (totalPrice <= 0.0) {
                        stringResource(R.string.sale_cash_payout)
                    } else {
                        stringResource(R.string.pay_cash).substringAfter('\n')
                    },
                    ready && cashierHasRegister,
                    onSubmitCash,
                )
            )
        }
    }

    OperatorPanel(
        modifier = modifier,
        backgroundColor = OperatorPalette.panelMuted,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(if (compactHandheld) 8.dp else 10.dp)) {
            if (!compactHandheld) {
                Text(
                    text = stringResource(R.string.sale_current_order),
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
                        text = stringResource(R.string.sale_more_items, basketLines.size - 6),
                        color = OperatorPalette.subtitle,
                        fontSize = 13.sp,
                    )
                }
            }

            if (compactHandheld) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = if (basketCount > 0) {
                            stringResource(R.string.sale_items_count, basketCount)
                        } else {
                            stringResource(R.string.sale_compact_empty_hint)
                        },
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f),
                    )
                    if (basketCount > 0) {
                        Box(
                            modifier = Modifier
                                .background(OperatorPalette.panel, RoundedCornerShape(999.dp))
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                        ) {
                            Text(
                                text = basketCount.toString(),
                                color = OperatorPalette.title,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = if (totalPrice < 0.0) {
                        stringResource(R.string.sale_credit_payout_total_label)
                    } else {
                        stringResource(R.string.sale_total_label)
                    },
                    color = OperatorPalette.title,
                    fontSize = if (compactHandheld) 17.sp else 18.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = formatSignedEuro(totalPrice),
                    color = OperatorPalette.success,
                    fontSize = if (compactHandheld) 22.sp else 24.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            if (paymentActions.isEmpty()) {
                if (stackPaymentActions) {
                    CompactActionButton(
                        text = stringResource(R.string.sale_no_payment_method_configured),
                        enabled = false,
                        emphasized = false,
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {},
                    )
                } else {
                    CompactActionButton(
                        text = stringResource(R.string.sale_no_payment_method_configured),
                        enabled = false,
                        emphasized = false,
                        onClick = {},
                    )
                    if (basketCount > 0) {
                        Text(
                            text = stringResource(R.string.sale_clear_basket),
                            color = Color(0xFFFF4D4D),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable(onClick = onAbort),
                        )
                    }
                }
            } else {
                val usePrimaryLayout = paymentActions.size == 1 && !stackPaymentActions
                val primaryAction = paymentActions.firstOrNull { it.large }?.takeIf { usePrimaryLayout }
                val secondaryActions = if (usePrimaryLayout) {
                    paymentActions.filterNot { it.large }
                } else {
                    paymentActions
                }

                if (primaryAction != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CompactActionButton(
                            text = primaryAction.label,
                            enabled = primaryAction.enabled,
                            emphasized = true,
                            modifier = Modifier.fillMaxWidth(),
                            minHeight = 58.dp,
                            textFontSize = 18.sp,
                            onClick = primaryAction.onClick,
                        )
                    }
                }

                if (stackPaymentActions) {
                    secondaryActions.forEach { action ->
                        CompactActionButton(
                            text = action.label,
                            enabled = action.enabled,
                            emphasized = true,
                            modifier = Modifier.fillMaxWidth(),
                            minHeight = 46.dp,
                            textFontSize = 15.sp,
                            onClick = action.onClick,
                        )
                    }
                } else {
                    secondaryActions.chunked(if (secondaryActions.size > 2) 2 else secondaryActions.size.coerceAtLeast(1))
                        .forEach { actionRow ->
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
                                        minHeight = 46.dp,
                                        textFontSize = 15.sp,
                                        onClick = action.onClick,
                                    )
                                }
                                repeat(2 - actionRow.size) {
                                    Box(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                }
                if (!stackPaymentActions && basketCount > 0) {
                    Text(
                        text = stringResource(R.string.sale_clear_basket),
                        color = Color(0xFFFF4D4D),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable(onClick = onAbort),
                    )
                }
            }
            if (stackPaymentActions && (compactHandheld || basketCount > 0)) {
                val clearBasketVisible = basketCount > 0
                val clearBasketClick = if (clearBasketVisible) onAbort else ({})
                CompactActionButton(
                    text = stringResource(R.string.sale_clear_basket),
                    enabled = ready && clearBasketVisible,
                    emphasized = false,
                    destructive = true,
                    modifier = Modifier.fillMaxWidth(),
                    minHeight = 34.dp,
                    textFontSize = 13.sp,
                    onClick = clearBasketClick,
                )
            }
        }
    }
}

@Composable
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
                    val direction = when {
                        button.price is SaleItemPrice.Returnable && amount.amount < 0 -> {
                            " ${stringResource(R.string.sale_deposit_return)}"
                        }
                        button.price is SaleItemPrice.Returnable && amount.amount > 0 -> {
                            " ${stringResource(R.string.sale_deposit_extra_issue)}"
                        }
                        else -> ""
                    }
                    lines += SaleBasketSummaryLine(
                        label = "${abs(amount.amount)}x $label$direction",
                        value = formatSignedEuro(amount.amount * unitPrice),
                    )
                }
            }

            is SaleItemAmount.FreePrice -> {
                if (amount.price > 0u) {
                    lines += SaleBasketSummaryLine(
                        label = label,
                        value = formatSignedEuro(amount.price.toDouble() / 100.0),
                    )
                }
            }
        }
    }

    val voucherAmount = saleStatus.voucherAmount
    if (voucherAmount != null && voucherAmount > 0) {
        lines += SaleBasketSummaryLine(
            label = "$voucherAmount ${if (voucherAmount == 1) stringResource(R.string.sale_voucher_singular) else stringResource(R.string.sale_voucher_plural)}",
            value = stringResource(R.string.sale_applied),
        )
    }

    return lines
}

private fun formatSignedEuro(amount: Double): String {
    return if (amount < 0.0) {
        "-€%.2f".format(abs(amount))
    } else {
        "€%.2f".format(amount)
    }
}

private data class CompactPaymentAction(
    val label: String,
    val enabled: Boolean,
    val onClick: () -> Unit,
    val large: Boolean = false,
)

@Composable
private fun CompactActionButton(
    text: String,
    enabled: Boolean,
    emphasized: Boolean,
    modifier: Modifier = Modifier,
    destructive: Boolean = false,
    minHeight: Dp = 46.dp,
    textFontSize: TextUnit = 15.sp,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = minHeight),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = when {
                destructive -> Color(0xFFB91C1C)
                emphasized -> OperatorPalette.accent
                else -> OperatorPalette.pill
            },
            contentColor = if (emphasized) OperatorPalette.accentText else Color.White,
            disabledBackgroundColor = OperatorPalette.panel,
            disabledContentColor = OperatorPalette.subtitle,
        ),
    ) {
        Text(
            text = text,
            fontSize = textFontSize,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
