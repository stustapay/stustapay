package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanView
import de.stustanet.stustapay.ui.order.OrderViewModel
import kotlinx.coroutines.launch

@Composable
private fun OrderItem(
    name: String,
    price: String,
    amount: String,
    onIncr: () -> Unit,
    onDecr: () -> Unit
) = Row(
    horizontalArrangement = Arrangement.SpaceEvenly,
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier.fillMaxWidth()
) {
    Text(
        text = price.plus(" x ").plus(amount),
        modifier = Modifier.fillMaxWidth(0.3f)
    )

    Box(modifier = Modifier.fillMaxWidth(0.9f)) {
        Row(horizontalArrangement = Arrangement.SpaceEvenly) {
            Button(
                onClick = onIncr,
                modifier = Modifier.fillMaxWidth(0.7f)
            ) {
                Text(text = name)
            }
            Button(
                onClick = onDecr,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(text = "-")
            }
        }
    }
}

@Preview
@Composable
fun OrderView(viewModel: OrderViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val state = rememberScaffoldState()
    val scope = rememberCoroutineScope()

    val totalCost = uiState.currentOrder.map {
        uiState.products[it.key]!!.second * it.value
    }.sum()

    if (uiState.chipScanned) {
        Scaffold(
            scaffoldState = state,
            content = {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = it.calculateBottomPadding()),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "$totalCost€ Paid", fontSize = 48.sp)
                        for (product in uiState.currentOrder) {
                            val name = uiState.products[product.key]!!.first
                            val amount = product.value
                            Text(text = "$amount $name", fontSize = 24.sp)
                        }
                    }
                }
            },
            bottomBar = {
                Button(
                    onClick = {
                        viewModel.reset()
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = "Next")
                }
            }
        )
    } else {
        ChipScanView(onScan = {
            viewModel.scanSuccessful(it)
        }) { chipScanState ->
            Scaffold(
                scaffoldState = state,
                content = { paddingValues ->
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = paddingValues.calculateBottomPadding())
                    ) {
                        for (product in uiState.products) {
                            item {
                                OrderItem(
                                    name = product.value.first,
                                    amount = uiState.currentOrder.getOrDefault(product.key, 0)
                                        .toString(),
                                    price = product.value.second.toString(),
                                    onIncr = { viewModel.incrementOrderProduct(product.key) },
                                    onDecr = { viewModel.decrementOrderProduct(product.key) }
                                )
                            }
                        }
                    }
                },
                bottomBar = {
                    Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                        Button(
                            onClick = {
                                viewModel.clearOrder()
                            },
                            modifier = Modifier.fillMaxWidth(0.45f)
                        ) {
                            Text(text = "❌")
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    chipScanState.scan("$totalCost€\nScan a chip")
                                }
                            },
                            modifier = Modifier.fillMaxWidth(0.9f)
                        ) {
                            Text(text = "✓")
                        }
                    }
                }
            )
        }
    }
}
