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
    val orderConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleDraft by viewModel.saleDraft.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            Column {
                TopAppBar(title = { Text(orderConfig.tillName) })

                Row(horizontalArrangement = Arrangement.Start) {
                    OrderCost(saleDraft)
                }
            }
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())
            ) {
                for (button in saleDraft.buttonSelection) {
                    // TODO: use serverOrder's product names here
                    //       not just the button captions
                    item {
                        OrderConfirmItem(
                            "ButtonID: ${button.key}",
                            button.value.price ?: 0.0,
                            button.value.quantity ?: 0,
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