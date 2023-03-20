package de.stustanet.stustapay.ui.order

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

/**
 * View for displaying available purchase items
 */
@Composable
fun OrderSelection(
    viewModel: OrderViewModel,
    onAbort: () -> Unit,
    onSubmit: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current

    Scaffold(
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())
            ) {
                for (product in uiState.products) {
                    item {
                        OrderItem(
                            caption = product.value.caption,
                            amount = uiState.currentOrder.getOrDefault(product.value.id, 0),
                            price = product.value.price,
                            onIncr = { viewModel.incrementOrderProduct(product.value.id) },
                            onDecr = { viewModel.decrementOrderProduct(product.value.id) }
                        )
                    }
                }
            }
        },
        bottomBar = {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onAbort()
                    },
                    modifier = Modifier
                        .fillMaxWidth(0.5f)
                        .height(70.dp)
                        .padding(10.dp)
                ) {
                    Text(text = "❌")
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onSubmit()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp)
                        .padding(10.dp)
                ) {
                    Text(text = "✓")
                }
            }
        }
    )
}