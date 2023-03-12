package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.chipscan.ChipScanView
import de.stustanet.stustapay.ui.order.OrderViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@Composable
private fun OrderItem(
    name: String,
    price: Float,
    amount: Int,
    onIncr: () -> Unit,
    onDecr: () -> Unit
) {
    val haptic = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = price.toString().plus(" x ").plus(amount.toString()),
            modifier = Modifier.fillMaxWidth(0.25f),
            fontSize = 24.sp
        )

        Box(modifier = Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onIncr()
                    },
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(90.dp)
                        .padding(5.dp)
                ) {
                    Text(text = name, fontSize = 24.sp)
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDecr()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                        .padding(5.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red)
                ) {
                    Text(text = "-", fontSize = 36.sp)
                }
            }
        }
    }
}

@Preview
@Composable
fun OrderView(viewModel: OrderViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val nav = rememberNavController()
    val haptic = LocalHapticFeedback.current

    val totalCost = uiState.currentOrder.map {
        uiState.products[it.key]!!.second * it.value
    }.sum()

    NavHost(navController = nav, startDestination = "main") {
        composable("main") {
            ChipScanView(
                onScan = { uid ->
                    // TODO: Connect to DB
                    if (totalCost < 10) {
                        nav.navigate("success") { launchSingleTop = true }
                    } else {
                        nav.navigate("failure") { launchSingleTop = true }
                    }
                },
                prompt = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("%.2f€".format(totalCost), fontSize = 48.sp)
                        Text("scan a chip", fontSize = 48.sp)
                    }
                }
            ) { chipScanState ->
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
                                        name = product.value.first,
                                        amount = uiState.currentOrder.getOrDefault(product.key, 0),
                                        price = product.value.second,
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
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
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
                                    scope.launch {
                                        chipScanState.scan()
                                    }
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
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
        }
        composable("success") {
            Scaffold(
                content = { padding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = padding.calculateBottomPadding()),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("%.2f€ paid".format(totalCost), fontSize = 48.sp)
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
                            viewModel.clearOrder()
                            nav.navigate("main") { launchSingleTop = true }
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(70.dp)
                            .padding(10.dp)
                    ) {
                        Text(text = "Next")
                    }
                }
            )
        }
        composable("failure") {
            Scaffold(
                content = { padding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = padding.calculateBottomPadding()),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "Insufficient Funds", fontSize = 48.sp)
                        }
                    }
                },
                bottomBar = {
                    Button(
                        onClick = {
                            viewModel.clearOrder()
                            nav.navigate("main") { launchSingleTop = true }
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(70.dp)
                            .padding(10.dp)
                    ) {
                        Text(text = "Next")
                    }
                }
            )
        }
    }
}
