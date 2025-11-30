package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.padding
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.PaymentMethod
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.pay.PaymentAction
import de.stustapay.stustapay.ui.common.pay.PaymentVariant
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

            // TODO: directly get a list from TerminalTillConfig (#513)
            var paymentActions = mutableListOf<PaymentAction>()
            if (config is SaleConfig.Ready) {
                if (config.till.enableSspPayment) {
                    paymentActions.add(PaymentAction(method = PaymentVariant.ssp, action = {
                        scope.launch {
                            viewModel.checkSale(PaymentMethod.tag)
                        }
                    }, enabled = true))
                }
                if (config.till.enableCashPayment) {
                    val onlyFree = totalPrice == 0.0 && saleStatus.buttonSelection.isNotEmpty()
                    paymentActions.add(
                        PaymentAction(
                            method = if (onlyFree)
                                PaymentVariant.free else
                                PaymentVariant.cash,
                            action = {
                                scope.launch {
                                    // TODO: use payment method "none" here when onlyFree
                                    viewModel.checkSale(PaymentMethod.cash)
                                }
                            },
                            // has cash register
                            enabled = config.till.cashRegisterId != null || onlyFree
                        )
                    )
                }
                if (config.till.enableCardPayment) {
                    paymentActions.add(
                        PaymentAction(
                            method = PaymentVariant.card,
                            action = {
                                scope.launch {
                                    viewModel.checkSale(PaymentMethod.sumup)
                                }
                            },
                            enabled = totalPrice > 0.0
                        )
                    )
                }
            }

            ProductSelectionBottomBar(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
                    .padding(bottom = 5.dp),
                status = {
                    StatusText(status = status)
                },
                ready = config is SaleConfig.Ready,
                paymentActions = paymentActions,
                onAbort = {
                    scope.launch {
                        viewModel.clearSale()
                    }
                },
                price = totalPrice
            )
        }
    )
}