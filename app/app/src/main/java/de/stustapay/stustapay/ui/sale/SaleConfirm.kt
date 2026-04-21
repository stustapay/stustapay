package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.PendingLineItem
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorMetricCard
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPaymentLayoutProfile
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorRailSummaryRow
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.libssp.util.formatCurrencyValue
import kotlin.math.abs

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleConfirm(
    viewModel: SaleViewModel,
    onEdit: () -> Unit,
    onConfirm: () -> Unit,
) {
    val saleDraft by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val config = saleConfig

    val checkedSale = saleDraft.checkedSale
    if (checkedSale == null) {
        Column {
            Text(status)
            Text(stringResource(R.string.sale_no_check_present))
        }
        return
    }

    OperatorScaffold(
        title = if (config is SaleConfig.Ready) config.tillName else stringResource(R.string.sale_no_till),
        subtitle = stringResource(R.string.sale_check_your_order),
        icon = Icons.Filled.ShoppingCart,
        terminalLabel = stringResource(R.string.sale_terminal_confirm),
        footerHint = status,
        footerSection = stringResource(R.string.sale_compact_title),
        footerStatus = stringResource(R.string.sale_footer_ready),
        showFooter = false,
        onBack = onEdit,
        headerFlowTitle = stringResource(R.string.sale_compact_title),
        headerTillLabel = if (config is SaleConfig.Ready) config.tillName else null,
    ) {
        OperatorAdaptivePaymentLayout(
            modifier = Modifier.fillMaxSize(),
            mainContent = { profile ->
                SaleConfirmMainContent(
                    profile = profile,
                    checkedSale = checkedSale,
                )
            },
            railContent = { profile ->
                SaleConfirmRail(
                    profile = profile,
                    checkedSale = checkedSale,
                    status = status,
                    ready = config is SaleConfig.Ready,
                    onEdit = onEdit,
                    onConfirm = onConfirm,
                )
            },
        )
    }
}

@Composable
private fun ColumnScope.SaleConfirmMainContent(
    profile: OperatorPaymentLayoutProfile,
    checkedSale: de.stustapay.api.models.PendingSale,
) {
    val topCards = buildList {
        add(
            Triple(
                if (checkedSale.totalPrice < 0.0) {
                    stringResource(R.string.sale_credit_payout_total_label)
                } else {
                    stringResource(R.string.price)
                },
                formatSaleAmount(checkedSale.totalPrice),
                true,
            )
        )
        add(
            Triple(
                stringResource(R.string.credit_left),
                formatSaleAmount(checkedSale.newBalance),
                checkedSale.newBalance > 0.0,
            )
        )
        if (checkedSale.newVoucherBalance > 0) {
            add(
                Triple(
                    stringResource(R.string.remaining_vouchers),
                    checkedSale.newVoucherBalance.intValue().toString(),
                    true,
                )
            )
        }
    }

    val rows = topCards.chunked(2)
    rows.forEach { rowCards ->
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(profile.gap),
        ) {
            rowCards.forEach { (label, value, accent) ->
                OperatorMetricCard(
                    label = label,
                    value = value,
                    accent = accent,
                    modifier = Modifier.weight(1f),
                )
            }
            repeat(2 - rowCards.size) {
                Column(modifier = Modifier.weight(1f)) {}
            }
        }
    }

    OperatorPanel(
        modifier = if (profile.counterLayout) {
            Modifier
                .weight(1f)
                .fillMaxWidth()
        } else {
            Modifier.fillMaxWidth()
        },
        backgroundColor = OperatorPalette.panelMuted,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(profile.gap),
            ) {
                if (checkedSale.usedVouchers > 0) {
                    item {
                        SaleConfirmVoucherCard(
                            title = stringResource(R.string.used_vouchers),
                            value = checkedSale.usedVouchers.intValue().toString(),
                        )
                    }
                }
                items(
                    checkedSale.lineItems,
                    key = { lineItem ->
                        listOf(
                            lineItem.product.id,
                            lineItem.taxRateId,
                            lineItem.productPrice,
                            lineItem.quantity,
                        )
                    },
                ) { lineItem ->
                    SaleConfirmLineItemCard(lineItem = lineItem)
                }
            }
        }
    }
}

@Composable
private fun ColumnScope.SaleConfirmRail(
    profile: OperatorPaymentLayoutProfile,
    checkedSale: de.stustapay.api.models.PendingSale,
    status: String,
    ready: Boolean,
    onEdit: () -> Unit,
    onConfirm: () -> Unit,
) {
    OperatorPanel(
        modifier = if (profile.counterLayout) Modifier.fillMaxHeight() else Modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panelMuted,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(profile.gap)) {
            Text(
                text = status,
                color = OperatorPalette.subtitle,
                fontSize = 15.sp,
                lineHeight = 21.sp,
                fontWeight = FontWeight.Medium,
            )

            OperatorActionButton(
                text = stringResource(R.string.book_order),
                onClick = onConfirm,
                enabled = ready,
            )
            OperatorActionButton(
                text = stringResource(R.string.edit),
                onClick = onEdit,
                enabled = ready,
                primary = false,
            )
        }
    }
}

@Composable
private fun SaleConfirmLineItemCard(
    lineItem: PendingLineItem,
) {
    val quantity = lineItem.quantity.intValue()
    val isReturnable = lineItem.product.isReturnable
    val direction = when {
        isReturnable && quantity < 0 -> stringResource(R.string.sale_deposit_return)
        isReturnable && quantity > 0 -> stringResource(R.string.sale_deposit_extra_issue)
        else -> null
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        color = OperatorPalette.panel,
        border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
        elevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = lineItem.product.name,
                    color = OperatorPalette.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = formatCurrencyValue(lineItem.totalPrice),
                    color = OperatorPalette.accent,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
            }
            Text(
                text = buildString {
                    append(abs(quantity))
                    append(" × ")
                    append(formatCurrencyValue(lineItem.productPrice))
                    if (direction != null) {
                        append(" · ")
                        append(direction)
                    }
                },
                color = OperatorPalette.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun SaleConfirmVoucherCard(
    title: String,
    value: String,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        color = OperatorPalette.panel,
        border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
        elevation = 0.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = title,
                color = OperatorPalette.title,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = value,
                color = OperatorPalette.accent,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
            )
        }
    }
}

private fun formatSaleAmount(amount: Double): String = "%.2f€".format(amount)
