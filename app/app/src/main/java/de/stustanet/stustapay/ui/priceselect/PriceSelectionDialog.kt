package de.stustanet.stustapay.ui.priceselect


import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun PriceSelectionDialog(
    state: PriceSelectionState,
    onEnter: (UInt) -> Unit,
    onClear: () -> Unit,
    viewModel: PriceSelectionDialogViewModel = hiltViewModel(),
) {
    val haptic = LocalHapticFeedback.current

    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            }
        ) {
            Box(Modifier.fillMaxSize(0.9f)) {
                Card(modifier = Modifier.padding(10.dp)) {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        content = { paddingValues ->
                            PriceSelection(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(bottom = paddingValues.calculateBottomPadding()),
                                onEnter = {
                                    viewModel.setAmount(it)
                                },
                                onClear = {
                                    viewModel.clear()
                                    onClear()
                                },
                            )
                        },
                        bottomBar = {
                            Column {
                                Row {
                                    Button(
                                        modifier = Modifier
                                            .fillMaxWidth(0.5f)
                                            .height(70.dp)
                                            .padding(20.dp),
                                        onClick = {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            state.close()
                                        }
                                    ) {
                                        // HEAVY LEFTWARDS ARROW WITH EQUILATERAL ARROWHEAD
                                        Text(text = "\uD83E\uDC18 back", fontSize = 24.sp)
                                    }

                                    Button(
                                        modifier = Modifier
                                            .fillMaxWidth(0.5f)
                                            .height(70.dp)
                                            .padding(20.dp),
                                        onClick = {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            onEnter(viewModel.amount.value)
                                            state.close()
                                        }
                                    ) {
                                        Text(text = "✓ OK", fontSize = 48.sp)
                                    }
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}