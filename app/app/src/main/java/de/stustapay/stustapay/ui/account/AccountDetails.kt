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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.Order
import de.stustapay.api.models.OrderType
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.stustapay.ui.common.TagItem
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import de.stustapay.stustapay.ui.nav.NavDest
import java.time.format.DateTimeFormatter
import java.util.TimeZone

@Composable
fun AccountDetails(
    navigateTo: (NavDest) -> Unit, viewModel: AccountViewModel
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var detailOrder by remember { mutableStateOf<Order?>(null) }

    if (detailOrder != null) {
        val sale = detailOrder!!
        Dialog(onDismissRequest = { detailOrder = null }) {
            Card(
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.width(350.dp),
                elevation = 8.dp,
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            sale.bookedAt.toZonedDateTime()
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), fontSize = 24.sp
                        )

                        Text(
                            sale.bookedAt.toZonedDateTime()
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("HH:mm:ss")), fontSize = 24.sp
                        )
                    }

                    Divider()

                    for (item in sale.lineItems) {
                        ProductConfirmItem(
                            name = item.product.name,
                            price = item.productPrice,
                            quantity = item.quantity.intValue()
                        )
                    }

                    Divider()

                    ProductConfirmItem(
                        name = stringResource(R.string.history_sum),
                        price = sale.totalPrice,
                    )
                }
            }
        }
    }

    Scaffold(content = {
        CloseContent(
            modifier = Modifier
                .padding(it)
                .fillMaxSize()
                .padding(10.dp),
            onClose = {
                navigateTo(CustomerStatusNavDests.status)
            },
        ) {
            Column {
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

                    Divider(modifier = Modifier.padding(vertical = 10.dp))

                    LazyColumn {
                        for (order in customer.orders.reversed()) {
                            item {
                                OrderListEntry(order, onClick = {
                                    detailOrder = order
                                })
                            }
                        }
                    }
                }
            }
        }
    }, bottomBar = {
        Column {
            Divider(modifier = Modifier.padding(vertical = 10.dp))
            Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp, bottom = 10.dp)) {
                val text = when (val state = uiState.customer) {
                    is CustomerStatusRequestState.Idle -> {
                        stringResource(R.string.common_status_idle)
                    }

                    is CustomerStatusRequestState.Fetching -> {
                        stringResource(R.string.common_status_fetching)
                    }

                    is CustomerStatusRequestState.Done -> {
                        stringResource(R.string.common_status_done)
                    }

                    is CustomerStatusRequestState.DoneDetails -> {
                        stringResource(R.string.common_status_done)
                    }

                    is CustomerStatusRequestState.Failed -> {
                        state.msg
                    }
                }
                Text(text, fontSize = 24.sp)
            }
        }
    })
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
        OrderType.cancelSale -> {
            icon = Icons.Filled.Clear
            label = R.string.common_action_cancel
            amount = -order.totalPrice
        }
        OrderType.topUp -> {
            icon = Icons.Filled.KeyboardArrowUp
            label = R.string.topup
            amount = order.totalPrice
        }
        OrderType.payOut -> {
            icon = Icons.Filled.KeyboardArrowDown
            label = R.string.payout
            amount = -order.totalPrice
        }
        OrderType.ticket -> {
            icon = Icons.Filled.Face
            label = R.string.root_item_ticket
            amount = -order.totalPrice
        }
        OrderType.moneyTransfer -> {}
        OrderType.moneyTransferImbalance -> {}
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