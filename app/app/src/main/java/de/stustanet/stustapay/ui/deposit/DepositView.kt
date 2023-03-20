package de.stustanet.stustapay.ui.deposit

import DepositKeyboard
import android.annotation.SuppressLint
import android.app.Activity
import java.math.BigDecimal
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
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
import de.stustanet.stustapay.ui.ec.ECView
import kotlinx.coroutines.launch

@Preview
@Composable
fun DepositView(viewModel: DepositViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current
    val context = LocalContext.current as Activity

    val amount = uiState.currentAmount.toFloat() / 100

    NavHost(navController = nav, startDestination = "main") {
        composable("main") {
            ChipScanView(onScan = { uid ->
                // TODO: Connect to DB
                if (amount < 10) {
                    nav.navigate("success") { launchSingleTop = true }
                } else {
                    nav.navigate("failure") { launchSingleTop = true }
                }
            }) { chipScanState ->
                Scaffold(
                    content = { paddingValues ->
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(bottom = paddingValues.calculateBottomPadding()),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier.height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(text = "$amount€", fontSize = 72.sp)
                            }
                            DepositKeyboard(
                                onDigit = { viewModel.inputDigit(it) },
                                onClear = { viewModel.clear() }
                            )
                        }
                    },
                    bottomBar = {
                        Row() {
                            Button(
                                onClick = {
                                    nav.navigate("paymentselect")
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(70.dp)
                                    .padding(10.dp)
                            ) {
                                Text(text = "Proceed to Payment")
                            }
                        }
                    }
                )
            }
        }
        composable("paymentselect"){
            ChipScanView(onScan = { uid ->
                // TODO: Connect to DB
                if (amount < 10) {
                    nav.navigate("success") { launchSingleTop = true }
                } else {
                    nav.navigate("failure") { launchSingleTop = true }
                }
            }) { chipScanState ->
                Scaffold(
                    content= {paddingValues ->
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(bottom = paddingValues.calculateBottomPadding()),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Button(
                                onClick = {
                                    scope.launch {
                                            chipScanState.scan("$amount€\nScan a chip")
                                        }
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(70.dp)
                                    .padding(10.dp)
                            ) {
                                Text(text = "Cash")
                            }
                            ECView(BigDecimal(amount.toString()))
                        }
                    }
                )
            }
        }
        composable("success") {
            Scaffold(
                content = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = it.calculateBottomPadding()),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "$amount€\ndeposited", fontSize = 48.sp)
                    }
                },
                bottomBar = {
                    Button(
                        onClick = {
                            viewModel.clear()
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
                content = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = it.calculateBottomPadding()),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "Transaction Failed", fontSize = 48.sp)
                    }
                },
                bottomBar = {
                    Button(
                        onClick = {
                            viewModel.clear()
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