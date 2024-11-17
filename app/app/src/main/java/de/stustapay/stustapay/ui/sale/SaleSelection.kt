package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.pay.ProductSelectionBottomBar
import de.stustapay.stustapay.ui.nav.TopAppBar
import de.stustapay.stustapay.ui.nav.TopAppBarIcon
import kotlinx.coroutines.launch

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleSelection(
    viewModel: SaleViewModel,
    leaveView: () -> Unit = {},
) {
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleStatus by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val config = saleConfig

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (config is SaleConfig.Ready) {
                        Text(config.tillName)
                    } else {
                        Text("No Till")
                    }
                },
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                    leaveView()
                },
            )
        },
        content = { paddingValues ->

            // if we only have one free price item to sell
            // directly show the number keyboard.

            if (config is SaleConfig.Ready &&
                config.buttons.size == 1 &&
                config.buttons.all { it.value.price is SaleItemPrice.FreePrice }
            ) {
                val button = config.buttons.values.last()
                SaleSelectionFreePrice(
                    buttonId = button.id,
                    modifier = Modifier
                        .padding(bottom = paddingValues.calculateBottomPadding()),
                    viewModel = viewModel,
                )
            } else {
                SaleSelectionList(
                    modifier = Modifier
                        .padding(bottom = paddingValues.calculateBottomPadding()),
                    viewModel = viewModel
                )
            }
        },
        bottomBar = {
            var totalPrice = 0.0
            if (config is SaleConfig.Ready) {
                for (button in config.buttons) {
                    if (saleStatus.buttonSelection[button.value.id] != null) {
                        when (val buttonStatus = saleStatus.buttonSelection[button.value.id]!!) {
                            is SaleItemAmount.FreePrice -> {
                                totalPrice += buttonStatus.price.toDouble() / 100.0
                            }

                            is SaleItemAmount.FixedPrice -> {
                                totalPrice += when (val price = button.value.price) {
                                    is SaleItemPrice.FreePrice -> {
                                        buttonStatus.amount * (price.defaultPrice ?: 0.0)
                                    }

                                    is SaleItemPrice.FixedPrice -> {
                                        buttonStatus.amount * price.price
                                    }

                                    is SaleItemPrice.Returnable -> {
                                        buttonStatus.amount * (price.price ?: 0.0)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            ProductSelectionBottomBar(
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
                ready = config is SaleConfig.Ready,
                cashierHasRegister = config is SaleConfig.Ready && config.till.cashRegisterId != null,
                amountIsPositive = totalPrice > 0.0f,
                sspEnabled = config is SaleConfig.Ready && config.till.enableSspPayment,
                cashEnabled = config is SaleConfig.Ready && config.till.enableCashPayment,
                cardEnabled = config is SaleConfig.Ready && config.till.enableCardPayment,
                onAbort = {
                    scope.launch {
                        viewModel.clearSale()
                    }
                },
                onSubmitSsp = {
                    scope.launch {
                        viewModel.checkSale()
                    }
                },
                onSubmitCash = {
                    scope.launch {
                        viewModel.checkSaleCash()
                    }
                },
                onSubmitCard = {
                    scope.launch {
                        viewModel.checkSaleCard()
                    }
                },
                price = totalPrice
            )
        }
    )
}