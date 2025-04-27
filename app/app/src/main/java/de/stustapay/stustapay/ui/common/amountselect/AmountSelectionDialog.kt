package de.stustapay.stustapay.ui.common.amountselect


import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import de.stustapay.libssp.ui.common.ConfirmCard
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.libssp.ui.common.rememberDialogDisplayState

@Preview(showBackground = true)
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
    var currentAmount by remember { mutableStateOf(initialAmount()) }

    ConfirmCard(
        onConfirm = {
            onEnter(currentAmount)
            state.close()
        },
        onBack = {
            state.close()
        },
    ) {
        AmountSelection(
            modifier = Modifier.padding(bottom = 25.dp),
            amount = currentAmount,
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
    }
}