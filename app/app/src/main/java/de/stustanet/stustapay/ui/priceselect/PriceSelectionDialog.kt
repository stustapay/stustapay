package de.stustanet.stustapay.ui.priceselect


import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel

@Preview
@Composable
fun PreviewPriceSelectionDialog() {
    val state = rememberPriceSelectionState()
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        PriceSelectionCard(state = state, viewModel = PriceSelectionDialogViewModel())
    }
}

@Composable
fun PriceSelectionDialog(
    state: PriceSelectionState,
    onEnter: (UInt) -> Unit = {},
    onClear: () -> Unit = {},
    viewModel: PriceSelectionDialogViewModel = hiltViewModel(),
) {

    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            },
        ) {
            PriceSelectionCard(
                state = state,
                onEnter = onEnter,
                onClear = onClear,
                viewModel = viewModel
            )
        }
    }
}


@Composable
fun PriceSelectionCard(
    state: PriceSelectionState,
    onEnter: (UInt) -> Unit = {},
    onClear: () -> Unit = {},
    viewModel: PriceSelectionDialogViewModel
) {
    val haptic = LocalHapticFeedback.current

    Card(
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .padding(0.dp, 50.dp)
            .fillMaxWidth(),
        elevation = 8.dp,
    ) {
        Box(
            modifier = Modifier
                .padding(10.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            Scaffold(
                modifier = Modifier.fillMaxSize(),
                content = { paddingValues ->
                    PriceSelection(
                        state = state,
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
                    Row(
                        modifier = Modifier
                            .height(70.dp),
                    ) {
                        Button(
                            modifier = Modifier
                                .weight(1f, true)
                                .padding(8.dp, 0.dp)
                                .fillMaxHeight(),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                state.close()
                            }
                        ) {
                            // Leftwards arrow
                            Text(text = "← Back", fontSize = 24.sp)
                        }

                        Button(
                            modifier = Modifier
                                .weight(1f, true)
                                .padding(8.dp, 0.dp)
                                .fillMaxHeight(),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                onEnter(viewModel.amount.value)
                                state.close()
                            }
                        ) {
                            Text(text = "✓ OK", fontSize = 24.sp)
                        }
                    }
                }
            )
        }
    }
}