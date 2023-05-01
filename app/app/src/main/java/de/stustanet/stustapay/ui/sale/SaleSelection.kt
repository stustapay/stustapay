package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon
import de.stustanet.stustapay.ui.priceselect.PriceSelectionDialog
import de.stustanet.stustapay.ui.priceselect.rememberPriceSelectionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleSelection(
    viewModel: SaleViewModel,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
    leaveView: () -> Unit = {},
) {
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleDraft by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    val priceTargetButtonId = remember { MutableStateFlow(-1) }
    val priceSelectionState = rememberPriceSelectionState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(saleConfig.tillName) },
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                    leaveView()
                },
            )
        },
        content = { paddingValues ->
            PriceSelectionDialog(
                state = priceSelectionState,
                onEnter = {
                    viewModel.adjustPrice(priceTargetButtonId.value, newPrice = FreePrice.Set(it))
                },
                onClear = {
                    viewModel.adjustPrice(priceTargetButtonId.value, newPrice = FreePrice.Unset)
                },
            )

            LazyColumn(
                modifier = Modifier
                    .padding(bottom = paddingValues.calculateBottomPadding())
                    .padding(horizontal = 10.dp)
                    .fillMaxSize()
            ) {
                val vouchers = saleDraft.voucherAmount ?: saleDraft.checkedSale?.used_vouchers
                if (vouchers != null && (saleDraft.checkedSale?.old_voucher_balance ?: 0) > 0) {
                    // if the server says we used vouchers,
                    // allow adjustment here
                    item {
                        SaleSelectionItem(
                            caption = "Gutschein",
                            type = SaleSelectionItemType.Vouchers(
                                amount = vouchers,
                                maxAmount = saleDraft.checkedSale?.old_voucher_balance ?: -1,
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
                                        amount = (saleDraft.buttonSelection[button.value.id] as? SaleItemAmount.FixedPrice),
                                        onIncr = { viewModel.incrementButton(button.value.id) },
                                        onDecr = { viewModel.decrementButton(button.value.id) },
                                    )
                                }

                                is SaleItemPrice.Returnable -> {
                                    // returnable items can become negative and positive.
                                    SaleSelectionItemType.Returnable(
                                        price = price,
                                        amount = (saleDraft.buttonSelection[button.value.id] as? SaleItemAmount.FixedPrice),
                                        onIncr = { viewModel.incrementButton(button.value.id) },
                                        onDecr = { viewModel.decrementButton(button.value.id) },
                                        // TODO: i'd like a customizable text here :)
                                        incrementText = "Extra Krug",
                                    )
                                }

                                is SaleItemPrice.FreePrice -> {
                                    SaleSelectionItemType.FreePrice(
                                        // todo: preselect default price.defaultPrice when no freeprice is set yet
                                        amount = (saleDraft.buttonSelection[button.value.id] as? SaleItemAmount.FreePrice),
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
        },
        bottomBar = {
            SaleBottomBar(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp),
                status = {
                    Text(
                        text = status,
                        modifier = Modifier.fillMaxWidth(),
                        fontSize = 18.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                },
                saleConfig = saleConfig,
                onAbort = onAbort,
                onSubmit = onSubmit,
            )
        }
    )
}