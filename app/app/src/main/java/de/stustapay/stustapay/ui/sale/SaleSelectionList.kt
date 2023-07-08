package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelectionDialog
import de.stustapay.stustapay.ui.common.rememberDialogDisplayState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update

@Composable
fun SaleSelectionList(
    modifier: Modifier = Modifier,
    viewModel: SaleViewModel
) {
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleStatus by viewModel.saleStatus.collectAsStateWithLifecycle()
    val priceTargetButtonId = remember { MutableStateFlow(-1) }
    val priceSelectionState = rememberDialogDisplayState()

    AmountSelectionDialog(
        state = priceSelectionState,
        config = AmountConfig.Money(cents = true, limit = 15000u),
        initialAmount = { (saleStatus.buttonSelection[priceTargetButtonId.value] as? SaleItemAmount.FreePrice)?.price ?: 0u },
        onEnter = {
            viewModel.adjustPrice(priceTargetButtonId.value, newPrice = FreePrice.Set(it))
        },
        onClear = {
            viewModel.adjustPrice(priceTargetButtonId.value, newPrice = FreePrice.Unset)
        },
    )

    LazyColumn(
        modifier = modifier
            .padding(horizontal = 2.dp)
            .fillMaxSize()
    ) {
        val vouchers = saleStatus.voucherAmount ?: saleStatus.checkedSale?.used_vouchers
        if (vouchers != null && (saleStatus.checkedSale?.old_voucher_balance ?: 0) > 0) {
            // if the server says we used vouchers,
            // allow adjustment here
            item {
                SaleSelectionItem(
                    caption = stringResource(R.string.voucher),
                    type = SaleSelectionItemType.Vouchers(
                        amount = vouchers,
                        maxAmount = saleStatus.checkedSale?.old_voucher_balance ?: -1,
                        onIncr = { viewModel.incrementVouchers() },
                        onDecr = { viewModel.decrementVouchers() },
                    )
                )
            }
        }

        for (button in saleConfig.buttons) {
            item {
                SaleSelectionItem(
                    caption = button.value.caption,
                    type = when (val price = button.value.price) {
                        is SaleItemPrice.FixedPrice -> {
                            SaleSelectionItemType.FixedPrice(
                                price = price,
                                amount = (saleStatus.buttonSelection[button.value.id] as? SaleItemAmount.FixedPrice),
                                onIncr = { viewModel.incrementButton(button.value.id) },
                                onDecr = { viewModel.decrementButton(button.value.id) },
                            )
                        }

                        is SaleItemPrice.Returnable -> {
                            // returnable items can become negative and positive.
                            SaleSelectionItemType.Returnable(
                                price = price,
                                amount = (saleStatus.buttonSelection[button.value.id] as? SaleItemAmount.FixedPrice),
                                onIncr = { viewModel.incrementButton(button.value.id) },
                                onDecr = { viewModel.decrementButton(button.value.id) },
                                // TODO: i'd like a customizable text here :)
                                incrementText = "Extra Glas",
                            )
                        }

                        is SaleItemPrice.FreePrice -> {
                            SaleSelectionItemType.FreePrice(
                                // TODO: preselect default price.defaultPrice when no freeprice is set yet
                                amount = (saleStatus.buttonSelection[button.value.id] as? SaleItemAmount.FreePrice),
                                onPriceEdit = { clear ->
                                    if (clear) {
                                        viewModel.adjustPrice(
                                            button.value.id,
                                            newPrice = FreePrice.Unset
                                        )
                                    } else {
                                        // after the price was edited, where do we want to set it to?
                                        // we could add this mechanism to the PriceSelectionState.
                                        priceTargetButtonId.update { button.value.id }
                                        priceSelectionState.open()
                                    }
                                }
                            )
                        }
                    }
                )
            }
        }
    }
}