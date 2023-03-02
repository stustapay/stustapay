package de.stustanet.stustapay.ui.deposit

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
import kotlinx.coroutines.launch

@Preview
@Composable
fun DepositView(viewModel: DepositViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

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
                                Text(text = "✓")
                            }
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
                        modifier = Modifier.fillMaxWidth().height(70.dp).padding(10.dp)
                    ) {
                        Text(text = "Next")
                    }
                }
            )
        }
    }
}

@Composable
fun DepositKeyboard(onDigit: (UInt) -> Unit, onClear: () -> Unit) {
    val haptic = LocalHapticFeedback.current

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(1u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("1", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(2u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("2", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(3u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("3", fontSize = 24.sp)
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(4u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("4", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(5u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("5", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(6u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("6", fontSize = 24.sp)
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(7u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("7", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(8u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("8", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(9u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("9", fontSize = 24.sp)
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(0u)
                    onDigit(0u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("00", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(0u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("0", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onClear()
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("❌", fontSize = 24.sp)
            }
        }
    }
}