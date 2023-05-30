package de.stustanet.stustapay.ui.common.amountselect


import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.DialogDisplayState
import de.stustanet.stustapay.ui.common.rememberDialogDisplayState

@Preview
@Composable
fun PreviewAmountSelectionDialog() {
    val state = rememberDialogDisplayState()
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        AmountSelectionCard(
            initialAmount = { 1337u },
            state = state,
            config = AmountConfig.Money()
        ) {
            Text("Amount of fish eggs", fontSize = 24.sp)
        }
    }
}

@Composable
fun AmountSelectionDialog(
    state: DialogDisplayState,
    initialAmount: () -> UInt = { 0u },
    config: AmountConfig,
    onEnter: (UInt) -> Unit = {},
    onClear: () -> Unit = {},
    title: @Composable () -> Unit = {},
) {
    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            },
        ) {
            AmountSelectionCard(
                state = state,
                initialAmount = initialAmount,
                onEnter = onEnter,
                onClear = onClear,
                config = config,
                title = title,
            )
        }
    }
}


@Composable
fun AmountSelectionCard(
    state: DialogDisplayState,
    initialAmount: () -> UInt = { 0u },
    config: AmountConfig,
    onEnter: (UInt) -> Unit = {},
    onClear: () -> Unit = {},
    title: @Composable () -> Unit = {},
) {
    val haptic = LocalHapticFeedback.current

    var currentAmount by remember { mutableStateOf(initialAmount()) }

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
                    AmountSelection(
                        amount = currentAmount,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = paddingValues.calculateBottomPadding()),
                        onAmountUpdate = {
                            currentAmount = it
                        },
                        onClear = {
                            currentAmount = 0u
                            onClear()
                        },
                        config = config,
                        title = title,
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
                                .padding(horizontal = 4.dp, vertical = 0.dp)
                                .fillMaxHeight(),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                state.close()
                            }
                        ) {
                            // Leftwards arrow
                            Text(
                                text = stringResource(R.string.arrow_back),
                                fontSize = 24.sp,
                                textAlign = TextAlign.Center,
                            )
                        }

                        Button(
                            modifier = Modifier
                                .weight(1f, true)
                                .padding(horizontal = 4.dp, vertical = 0.dp)
                                .fillMaxHeight(),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                onEnter(currentAmount)
                                state.close()
                            }
                        ) {
                            Text(text = stringResource(R.string.check_ok), fontSize = 24.sp)
                        }
                    }
                }
            )
        }
    }
}