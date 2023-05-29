package de.stustanet.stustapay.ui.common.amountselect


import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.NumberKeyboard
import de.stustanet.stustapay.ui.theme.MoneyAmountStyle


@Composable
fun AmountSelection(
    modifier: Modifier = Modifier,
    amount: UInt? = null,
    initialAmount: (() -> UInt)? = null,
    config: AmountConfig,
    onAmountUpdate: (UInt) -> Unit,
    onClear: () -> Unit,
    viewModel: AmountSelectionViewModel = hiltViewModel(),
    title: @Composable () -> Unit = {},
) {
    val currentAmount by viewModel.amount.collectAsStateWithLifecycle()

    LaunchedEffect(config) {
        viewModel.updateConfig(config)
    }

    LaunchedEffect(amount) {
        if (amount != null) {
            viewModel.setAmount(amount)
        }
    }

    LaunchedEffect(initialAmount) {
        if (initialAmount != null) {
            viewModel.setAmount(initialAmount())
        }
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        title()
        Box(
            contentAlignment = Alignment.Center
        ) {
            Text(
                when (config) {
                    is AmountConfig.Money -> {
                        "%.2f€".format(currentAmount.toDouble() / 100)
                    }

                    else -> {
                        currentAmount.toString()
                    }
                },
                style = MoneyAmountStyle,
                modifier = Modifier.padding(vertical = 2.dp),
            )
        }
        NumberKeyboard(
            onDigitEntered = {
                onAmountUpdate(viewModel.inputDigit(it))
            },
            onClear = {
                viewModel.clear()
                onClear()
            },
        )
    }
}