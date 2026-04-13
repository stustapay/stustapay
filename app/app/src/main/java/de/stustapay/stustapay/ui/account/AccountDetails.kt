package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.Order
import de.stustapay.api.models.OrderType
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.TagItem
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.libssp.util.formatCurrencyValue
import java.time.format.DateTimeFormatter
import java.util.TimeZone
import kotlinx.coroutines.delay

@Composable
fun AccountDetails(
    navigateTo: (NavDest) -> Unit,
    viewModel: AccountViewModel,
    isSelfService: Boolean = false,
    onFinished: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var detailOrder by remember { mutableStateOf<Order?>(null) }

    LaunchedEffect(isSelfService, uiState.customer) {
        if (isSelfService && uiState.customer is CustomerStatusRequestState.DoneDetails) {
            delay(5000)
            onFinished()
        }
    }

    if (detailOrder != null) {
        val sale = detailOrder!!
        Dialog(onDismissRequest = { detailOrder = null }) {
            Card(
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.width(350.dp),
                elevation = 8.dp,
                backgroundColor = OperatorPalette.panel,
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            sale.bookedAt.toZonedDateTime()
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy")),
                            fontSize = 24.sp,
                            color = OperatorPalette.title,
                        )

                        Text(
                            sale.bookedAt.toZonedDateTime()
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                            fontSize = 24.sp,
                            color = OperatorPalette.title,
                        )
                    }

                    Divider(color = OperatorPalette.panelBorder)

                    for (item in sale.lineItems) {
                        AccountOrderLineItemRow(
                            name = item.product.name,
                            price = item.productPrice,
                            quantity = item.quantity.intValue(),
                            totalPrice = item.totalPrice,
                        )
                    }

                    Divider(color = OperatorPalette.panelBorder)

                    AccountOrderTotalRow(
                        label = stringResource(R.string.history_sum),
                        totalPrice = sale.totalPrice,
                    )
                }
            }
        }
    }

    if (isSelfService) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                val customer = uiState.customer
                if (customer is CustomerStatusRequestState.DoneDetails) {
                    val userTagUid = customer.account.userTagUid
                    if (userTagUid != null) {
                        TagItem(
                            NfcTag(userTagUid, null),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp)
                        )
                    }

                    val ordersNewestFirst = remember(customer.orders) {
                        customer.orders.asReversed()
                    }
                    LazyColumn {
                        items(ordersNewestFirst, key = { it.uuid }) { order ->
                            OrderListEntry(order, onClick = {
                                detailOrder = order
                            })
                        }
                    }
                }
            }
        }
        return
    }

    OperatorScaffold(
        title = stringResource(R.string.customer_details),
        subtitle = stringResource(R.string.account_details_subtitle),
        icon = Icons.AutoMirrored.Filled.List,
        terminalLabel = stringResource(R.string.account_terminal_label),
        footerHint = operatorCustomerStatusText(uiState.customer),
        footerSection = stringResource(R.string.account_footer_section_history),
        footerStatus = operatorDetailsBadge(uiState.customer),
        onBack = { navigateTo(CustomerStatusNavDests.status) },
    ) {
        val customer = uiState.customer
        when (customer) {
            is CustomerStatusRequestState.DoneDetails -> {
                val ordersNewestFirst = remember(customer.orders) {
                    customer.orders.asReversed()
                }
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            customer.account.userTagUid?.let { userTagUid ->
                                TagItem(
                                    NfcTag(userTagUid, null),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }

                            Text(
                                text = customer.account.name ?: stringResource(R.string.customer_title),
                                color = OperatorPalette.title,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                            )

                            Text(
                                text = stringResource(
                                    R.string.account_details_current_balance,
                                    formatCurrencyValue(customer.account.balance),
                                ),
                                color = OperatorPalette.subtitle,
                                fontSize = 18.sp,
                            )
                        }
                    }

                    if (customer.orders.isEmpty()) {
                        OperatorInfoCard(
                            title = stringResource(R.string.account_details_no_recent_orders),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = stringResource(R.string.account_details_no_recent_orders_desc),
                                color = OperatorPalette.subtitle,
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(ordersNewestFirst, key = { it.uuid }) { order ->
                                OperatorOrderListEntry(
                                    order = order,
                                    onClick = { detailOrder = order }
                                )
                            }
                        }
                    }
                }
            }

            is CustomerStatusRequestState.Fetching -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = stringResource(R.string.common_status_fetching),
                        color = OperatorPalette.subtitle,
                        fontSize = 24.sp,
                    )
                }
            }

            is CustomerStatusRequestState.Failed -> {
                OperatorInfoCard(
                    title = stringResource(R.string.account_details_unavailable),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = customer.msg.ifBlank { stringResource(R.string.failed_fetching) },
                        color = OperatorPalette.subtitle,
                    )
                }
            }

            else -> {
                OperatorInfoCard(
                    title = stringResource(R.string.account_details_no_data),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.account_details_no_data_desc),
                        color = OperatorPalette.subtitle,
                    )
                }
            }
        }
    }
}

@Composable
private fun AccountOrderLineItemRow(
    name: String,
    quantity: Int,
    price: Double,
    totalPrice: Double,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = name,
                color = OperatorPalette.title,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(
                    R.string.account_order_line_item_quantity_price,
                    quantity,
                    formatCurrencyValue(price),
                ),
                color = OperatorPalette.subtitle,
                fontSize = 14.sp,
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = formatCurrencyValue(totalPrice),
            color = OperatorPalette.title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun AccountOrderTotalRow(
    label: String,
    totalPrice: Double,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            color = OperatorPalette.subtitle,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = formatCurrencyValue(totalPrice),
            color = OperatorPalette.success,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
        )
    }
}

@Composable
fun OrderListEntry(order: Order, onClick: () -> Unit) {
    var icon = Icons.Filled.Warning
    var label = R.string.error
    var amount = 0.0;
    when (order.orderType) {
        OrderType.sale -> {
            icon = Icons.Filled.ShoppingCart
            label = R.string.root_item_sale
            amount = -order.totalPrice
        }
        OrderType.cancel_sale -> {
            icon = Icons.Filled.Clear
            label = R.string.common_action_cancel
            amount = -order.totalPrice
        }
        OrderType.top_up -> {
            icon = Icons.Filled.KeyboardArrowUp
            label = R.string.topup
            amount = order.totalPrice
        }
        OrderType.pay_out -> {
            icon = Icons.Filled.KeyboardArrowDown
            label = R.string.payout
            amount = order.totalPrice
        }
        OrderType.ticket -> {
            icon = Icons.Filled.Face
            label = R.string.root_item_ticket
            amount = -order.totalPrice
        }
        OrderType.money_transfer -> {}
        OrderType.money_transfer_imbalance -> {}
        OrderType.cashier_shift_start -> {}
        OrderType.cashier_shift_end -> {}
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(5.dp)
            .clickable {
                onClick()
            }, horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row {
            Icon(icon, "")
            Spacer(modifier = Modifier.width(5.dp))
            Text(stringResource(label))
        }

        Text(text = "%.02f€".format(amount), fontSize = 20.sp)
    }
}

@Composable
private fun OperatorOrderListEntry(order: Order, onClick: () -> Unit) {
    var icon = Icons.Filled.Warning
    var label = R.string.error
    var amount = 0.0
    when (order.orderType) {
        OrderType.sale -> {
            icon = Icons.Filled.ShoppingCart
            label = R.string.root_item_sale
            amount = -order.totalPrice
        }
        OrderType.cancel_sale -> {
            icon = Icons.Filled.Clear
            label = R.string.common_action_cancel
            amount = -order.totalPrice
        }
        OrderType.top_up -> {
            icon = Icons.Filled.KeyboardArrowUp
            label = R.string.topup
            amount = order.totalPrice
        }
        OrderType.pay_out -> {
            icon = Icons.Filled.KeyboardArrowDown
            label = R.string.payout
            amount = order.totalPrice
        }
        OrderType.ticket -> {
            icon = Icons.Filled.Face
            label = R.string.root_item_ticket
            amount = -order.totalPrice
        }
        OrderType.money_transfer -> {}
        OrderType.money_transfer_imbalance -> {}
        OrderType.cashier_shift_start -> {}
        OrderType.cashier_shift_end -> {}
    }

    OperatorPanel(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(icon, contentDescription = null, tint = OperatorPalette.accent)
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = stringResource(label),
                        color = OperatorPalette.title,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = order.bookedAt.toZonedDateTime()
                            .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                            .format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")),
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                    )
                }
            }

            Text(
                text = formatCurrencyValue(amount),
                color = if (amount >= 0.0) OperatorPalette.success else OperatorPalette.accent,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun operatorDetailsBadge(state: CustomerStatusRequestState): String {
    return when (state) {
        is CustomerStatusRequestState.DoneDetails -> stringResource(R.string.account_badge_orders, state.orders.size)
        is CustomerStatusRequestState.Done -> stringResource(R.string.account_badge_no_orders)
        is CustomerStatusRequestState.Fetching -> stringResource(R.string.account_badge_loading)
        is CustomerStatusRequestState.Failed -> stringResource(R.string.account_badge_error)
        is CustomerStatusRequestState.Idle -> stringResource(R.string.common_status_idle)
    }
}
