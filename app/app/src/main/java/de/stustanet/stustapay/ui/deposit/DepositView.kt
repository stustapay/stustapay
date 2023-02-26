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
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.ChipScanView
import kotlinx.coroutines.launch

@Preview
@Composable
fun DepositView(viewModel: DepositViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val state = rememberScaffoldState()
    val scope = rememberCoroutineScope()

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
                    val amount = uiState.currentAmount.toFloat() / 100
                    Text(text = "$amount€\ndeposited", fontSize = 48.sp)
                }
            },
            bottomBar = {
                Button(
                    onClick = { viewModel.reset() },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = "Next")
                }
            }
        )
    } else {
        ChipScanView(onScan = { viewModel.scanSuccessful(it) }) { chipScanState ->
            Scaffold(
                scaffoldState = state,
                content = { paddingValues ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = paddingValues.calculateBottomPadding()),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        val amount = uiState.currentAmount.toFloat() / 100
                        Text(text = "$amount€", fontSize = 48.sp)
                        DepositKeyboard(
                            onDigit = { viewModel.inputDigit(it) },
                            onClear = { viewModel.reset() }
                        )
                    }
                },
                bottomBar = {
                    Row() {
                        Button(
                            onClick = {
                                scope.launch {
                                    val amount = uiState.currentAmount.toFloat() / 100
                                    chipScanState.scan("$amount€\nScan a chip")
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(text = "✓")
                        }
                    }
                }
            )
        }
    }
}

@Composable
fun DepositKeyboard(onDigit: (UInt) -> Unit, onClear: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(modifier = Modifier.fillMaxWidth(0.33f), onClick = { onDigit(1u) }) {
                Text("1")
            }
            Button(modifier = Modifier.fillMaxWidth(0.5f), onClick = { onDigit(2u) }) {
                Text("2")
            }
            Button(modifier = Modifier.fillMaxWidth(1f), onClick = { onDigit(3u) }) {
                Text("3")
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(modifier = Modifier.fillMaxWidth(0.33f), onClick = { onDigit(4u) }) {
                Text("4")
            }
            Button(modifier = Modifier.fillMaxWidth(0.5f), onClick = { onDigit(5u) }) {
                Text("5")
            }
            Button(modifier = Modifier.fillMaxWidth(1f), onClick = { onDigit(6u) }) {
                Text("6")
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(modifier = Modifier.fillMaxWidth(0.33f), onClick = { onDigit(7u) }) {
                Text("7")
            }
            Button(modifier = Modifier.fillMaxWidth(0.5f), onClick = { onDigit(8u) }) {
                Text("8")
            }
            Button(modifier = Modifier.fillMaxWidth(1f), onClick = { onDigit(9u) }) {
                Text("9")
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Box(modifier = Modifier.fillMaxWidth(0.33f))
            Button(modifier = Modifier.fillMaxWidth(0.5f), onClick = { onDigit(0u) }) {
                Text("0")
            }
            Button(modifier = Modifier.fillMaxWidth(1f), onClick = { onClear() }) {
                Text("❌")
            }
        }
    }
}