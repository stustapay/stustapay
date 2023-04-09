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
fun OrderConfirmation(
    viewModel: OrderViewModel,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
) {
    val orderConfig by viewModel.orderConfig.collectAsStateWithLifecycle()
    val order by viewModel.order.collectAsStateWithLifecycle()
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
                for (product in order.buttonSelections) {
                    // TODO: use serverOrder's product names here
                    //       not just the button captions
                    item {
                        OrderConfirmItem("Bla: ${product.key}", 13.37, product.value)
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
                orderConfig = orderConfig,
                onAbort = onAbort,
                onSubmit = onSubmit,
            )
        }
    )
}