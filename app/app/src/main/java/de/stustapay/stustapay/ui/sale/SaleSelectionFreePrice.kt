package de.stustapay.stustapay.ui.sale

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.theme.MoneyAmountStyle
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.operator.OperatorPalette

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
        amountTextStyle = MoneyAmountStyle.copy(color = OperatorPalette.title),
    )
}
