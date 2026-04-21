package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update

private data class SaleSelectionEntry(
    /** Stable key for LazyColumn/LazyVerticalGrid item identity. */
    val stableKey: Any,
    val caption: String,
    val type: SaleSelectionItemType,
)

@Composable
fun SaleSelectionList(
    modifier: Modifier = Modifier,
    viewModel: SaleViewModel
) {
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleStatus by viewModel.saleStatus.collectAsStateWithLifecycle()
    val priceTargetButtonId = remember { MutableStateFlow(-1) }
    val priceSelectionState = rememberDialogDisplayState()
    val config = saleConfig

    SaleAmountSelectionDialog(
        state = priceSelectionState,
        config = AmountConfig.Money(cents = true, limit = 15000u),
        initialAmount = {
            (saleStatus.buttonSelection[priceTargetButtonId.value] as? SaleItemAmount.FreePrice)?.price
                ?: 0u
        },
        onEnter = {
            viewModel.adjustPrice(priceTargetButtonId.value, newPrice = FreePrice.Set(it))
        },
        onClear = {
            viewModel.adjustPrice(priceTargetButtonId.value, newPrice = FreePrice.Unset)
        },
    )

    val vouchers = saleStatus.voucherAmount ?: saleStatus.checkedSale?.usedVouchers?.intValue()
    val buttons = if (config is SaleConfig.Ready) config.buttons.values.toList() else emptyList()

    val entries = buildList {
        if (vouchers != null && (saleStatus.checkedSale?.oldVoucherBalance?.intValue() ?: 0) > 0) {
            add(
                SaleSelectionEntry(
                    stableKey = "sale_selection_vouchers",
                    caption = stringResource(R.string.voucher),
                    type = SaleSelectionItemType.Vouchers(
                        amount = vouchers,
                        maxAmount = saleStatus.checkedSale?.oldVoucherBalance?.intValue() ?: -1,
                        onIncr = { viewModel.incrementVouchers() },
                        onDecr = { viewModel.decrementVouchers() },
                    ),
                )
            )
        }

        buttons.forEach { button ->
            var returnCaption = "Extra Glas"
            val saleCaption = if (button.price is SaleItemPrice.Returnable) {
                val captionSplit = button.caption.split("///", limit = 2)
                if (captionSplit.size == 2) {
                    returnCaption = captionSplit[1]
                }
                captionSplit[0]
            } else {
                button.caption
            }

            add(
                SaleSelectionEntry(
                    stableKey = button.id,
                    caption = saleCaption,
                    type = when (val price = button.price) {
                        is SaleItemPrice.FixedPrice -> {
                            SaleSelectionItemType.FixedPrice(
                                price = price,
                                amount = (saleStatus.buttonSelection[button.id] as? SaleItemAmount.FixedPrice),
                                onIncr = { viewModel.incrementButton(button.id) },
                                onDecr = { viewModel.decrementButton(button.id) },
                            )
                        }

                        is SaleItemPrice.Returnable -> {
                            SaleSelectionItemType.Returnable(
                                price = price,
                                amount = (saleStatus.buttonSelection[button.id] as? SaleItemAmount.FixedPrice),
                                onIncr = { viewModel.incrementButton(button.id) },
                                onDecr = { viewModel.decrementButton(button.id) },
                                incrementText = returnCaption,
                            )
                        }

                        is SaleItemPrice.FreePrice -> {
                            SaleSelectionItemType.FreePrice(
                                amount = (saleStatus.buttonSelection[button.id] as? SaleItemAmount.FreePrice),
                                onPriceEdit = { clear ->
                                    if (clear) {
                                        viewModel.adjustPrice(
                                            button.id,
                                            newPrice = FreePrice.Unset
                                        )
                                    } else {
                                        priceTargetButtonId.update { button.id }
                                        priceSelectionState.open()
                                    }
                                }
                            )
                        }
                    },
                )
            )
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .padding(horizontal = 2.dp)
            .fillMaxSize()
    ) {
        if (entries.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                OperatorInfoCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 560.dp),
                    title = stringResource(R.string.sale_empty_title),
                ) {
                    Text(
                        text = stringResource(R.string.sale_empty_desc),
                        color = OperatorPalette.subtitle,
                        fontSize = 18.sp,
                        lineHeight = 24.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = stringResource(R.string.sale_empty_hint),
                        color = OperatorPalette.title,
                        fontSize = 16.sp,
                        lineHeight = 22.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            return@BoxWithConstraints
        }

        val cardLayout = maxWidth >= 760.dp

        if (cardLayout) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp),
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp),
            ) {
                items(entries, key = { it.stableKey }) { entry ->
                    SaleSelectionItem(
                        caption = entry.caption,
                        type = entry.type,
                        layout = SaleSelectionItemLayout.Card,
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 20.dp),
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
            ) {
                items(entries, key = { it.stableKey }) { entry ->
                    SaleSelectionItem(
                        caption = entry.caption,
                        type = entry.type,
                        layout = SaleSelectionItemLayout.ListRow,
                    )
                }
            }
        }
    }
}

@Composable
private fun SaleAmountSelectionDialog(
    state: de.stustapay.libssp.ui.common.DialogDisplayState,
    initialAmount: () -> UInt,
    config: AmountConfig,
    onEnter: (UInt) -> Unit,
    onClear: () -> Unit,
) {
    if (!state.isOpen()) {
        return
    }

    var currentAmount by remember(state.isOpen(), initialAmount()) {
        mutableStateOf(initialAmount())
    }

    Dialog(onDismissRequest = { state.close() }) {
        OperatorPanel(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp)
        ) {
            androidx.compose.foundation.layout.Column(
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = stringResource(R.string.sale_custom_price_dialog_title),
                    color = OperatorPalette.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                )
                AmountSelection(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(420.dp),
                    amount = currentAmount,
                    onAmountUpdate = { currentAmount = it },
                    onClear = {
                        currentAmount = 0u
                        onClear()
                    },
                    config = config,
                    title = {
                        Text(
                            text = "Free price item",
                            color = OperatorPalette.accent,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    },
                )
                OperatorPrimaryButton(
                    text = "Apply price",
                    icon = Icons.Filled.CheckCircle,
                    onClick = {
                        onEnter(currentAmount)
                        state.close()
                    },
                )
                OperatorSecondaryButton(
                    text = "Clear price",
                    icon = Icons.Filled.Refresh,
                    onClick = {
                        currentAmount = 0u
                        onClear()
                        state.close()
                    },
                )
                OperatorSecondaryButton(
                    text = stringResource(R.string.back),
                    icon = Icons.Filled.Edit,
                    onClick = { state.close() },
                )
            }
        }
    }
}
