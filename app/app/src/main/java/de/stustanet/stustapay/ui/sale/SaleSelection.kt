package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar
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
) {
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleDraft by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

    val priceTargetButtonId = remember { MutableStateFlow(-1) }
    val priceSelectionState = rememberPriceSelectionState()

    Scaffold(
        topBar = {
            Column {
                TopAppBar(title = { Text(saleConfig.tillName) })
            }
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
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())
            ) {
                if (saleDraft.voucherAmount != null) {
                    // if the server says we used vouchers,
                    // allow adjustment here
                    item {
                        SaleSelectionItem(
                            caption = "Vouchers",
                            variant = SaleSelectionItemType.Vouchers(
                                amount = saleDraft.voucherAmount ?: 0,
                                maxAmount = saleDraft.checkedSale?.old_voucher_balance ?: 0,
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
                            variant = when (val price = button.value.price) {
                                is SaleItemPrice.FixedPrice -> {
                                    SaleSelectionItemType.FixedPrice(
                                        price = price,
                                        amount = (saleDraft.buttonSelection[button.value.id] as? SaleItemAmount.FixedPrice),
                                        onIncr = { viewModel.incrementButton(button.value.id) },
                                        onDecr = { viewModel.decrementButton(button.value.id) },
                                    )
                                }
                                is SaleItemPrice.FreePrice -> {
                                    SaleSelectionItemType.FreePrice(
                                        price = price,
                                        amount = (saleDraft.buttonSelection[button.value.id] as? SaleItemAmount.FreePrice),
                                        onPriceEdit = { clear ->
                                            if (clear) {
                                                viewModel.adjustPrice(
                                                    button.value.id,
                                                    newPrice = FreePrice.Unset
                                                )
                                            } else {
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