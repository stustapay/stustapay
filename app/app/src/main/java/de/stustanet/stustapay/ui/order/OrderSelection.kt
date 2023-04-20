package de.stustanet.stustapay.ui.order

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar

/**
 * View for displaying available purchase items
 */
@Composable
fun OrderSelection(
    viewModel: OrderViewModel,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
) {
    val orderConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val order by viewModel.saleState.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            Column {
                TopAppBar(title = { Text(orderConfig.tillName) })

                Row(horizontalArrangement = Arrangement.Start) {
                    OrderCost(order)
                }
            }
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())
            ) {
                // TODO: voucher amount adjustment when in edit mode
                for (button in orderConfig.buttons) {
                    item {
                        OrderItem(
                            caption = button.value.caption,
                            amount = order.fixPricePositions.getOrDefault(button.value.id, 0),
                            price = button.value.price,
                            onIncr = { viewModel.incrementButton(button.value.id) },
                            onDecr = { viewModel.decrementButton(button.value.id) }
                        )
                    }
                }
            }
        },
        bottomBar = {
            OrderBottomBar(
                status = {
                    Text(
                        text = status,
                        modifier = Modifier.fillMaxWidth(),
                        fontSize = 18.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                },
                saleConfig = orderConfig,
                onAbort = onAbort,
                onSubmit = onSubmit,
            )
        }
    )
}