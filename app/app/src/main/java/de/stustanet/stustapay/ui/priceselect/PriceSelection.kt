package de.stustanet.stustapay.ui.priceselect


import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.NumberKeyboard

@Composable
fun PriceSelection(
    modifier: Modifier = Modifier,
    onEnter: (UInt) -> Unit,
    onClear: () -> Unit,
    allowCents: Boolean = true,
    state: PriceSelectionState = PriceSelectionState(),
    viewModel: PriceSelectionViewModel = hiltViewModel(),
) {
    val keyboardState by viewModel.amount.collectAsStateWithLifecycle()

    LaunchedEffect(state.amount) {
        viewModel.setAmount(state.amount)
    }

    LaunchedEffect(allowCents) {
        viewModel.allowCents(allowCents)
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            contentAlignment = Alignment.Center
        ) {
            Text(
                "%.2f€".format(keyboardState.toFloat() / 100),
                fontSize = 72.sp,
                modifier = Modifier.padding(vertical = 15.dp),
            )
        }
        NumberKeyboard(
            onDigitEntered = {
                onEnter(viewModel.inputDigit(it))
            },
            onClear = {
                viewModel.clear()
                onClear()
            },
        )
    }
}