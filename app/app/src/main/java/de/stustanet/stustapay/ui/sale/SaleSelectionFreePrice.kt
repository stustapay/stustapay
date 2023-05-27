package de.stustanet.stustapay.ui.sale

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.amountselect.AmountSelection

@Composable
fun SaleSelectionFreePrice(
    buttonId: Int,
    modifier: Modifier = Modifier,
    viewModel: SaleViewModel
) {
    val saleStatus by viewModel.saleStatus.collectAsStateWithLifecycle()

    val amount = saleStatus.buttonSelection[buttonId] as? SaleItemAmount.FreePrice

    AmountSelection(
        amount = amount?.price ?: 0u,
        modifier = modifier,
        config = AmountConfig.Money(cents = true, limit = 15000u),
        onAmountUpdate = {
            viewModel.adjustPrice(buttonId, newPrice = FreePrice.Set(it))
        },
        onClear = {
            viewModel.adjustPrice(buttonId, newPrice = FreePrice.Unset)
        },
    )
}