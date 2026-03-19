package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.TabRowDefaults.Divider
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.pay.ProductConfirmBottomBar
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import de.stustapay.stustapay.ui.common.pay.ProductConfirmLineItem

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleConfirm(
    viewModel: SaleViewModel,
    onEdit: () -> Unit,
    onConfirm: () -> Unit,
) {
    val saleDraft by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val config = saleConfig

    val checkedSale = saleDraft.checkedSale
    if (checkedSale == null) {
        Column {
            Text(status)
            Text("no sale check present!")
        }
        return
    }

    OperatorScaffold(
        title = if (config is SaleConfig.Ready) config.tillName else "No Till",
        subtitle = stringResource(R.string.sale_check_your_order),
        icon = Icons.Filled.ShoppingCart,
        terminalLabel = "Confirm",
        footerHint = status,
        footerSection = "Sale",
        footerStatus = "Ready",
        onBack = onEdit,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxWidth()) {
                ProductConfirmItem(
                    name = stringResource(R.string.price),
                    price = checkedSale.totalPrice,
                    bigStyle = true,
                )
                Divider(thickness = 2.dp)
                ProductConfirmItem(
                    name = stringResource(R.string.credit_left),
                    price = checkedSale.newBalance,
                )
                if (checkedSale.newVoucherBalance > 0) {
                    ProductConfirmItem(
                        name = stringResource(R.string.remaining_vouchers),
                        quantity = checkedSale.newVoucherBalance.intValue(),
                    )
                }
                Divider(thickness = 2.dp)
            }

            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {

                if (checkedSale.usedVouchers > 0) {
                    item {
                        ProductConfirmItem(
                            name = stringResource(R.string.used_vouchers),
                            quantity = checkedSale.usedVouchers.intValue(),
                        )
                    }
                }

                for (lineItem in checkedSale.lineItems) {
                    item {
                        ProductConfirmLineItem(
                            lineItem = lineItem
                        )
                    }
                }
            }

            ProductConfirmBottomBar(
                abortText = stringResource(R.string.edit),
                submitSize = 24.sp,
                submitText = stringResource(R.string.book_order),
                status = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = status,
                            modifier = Modifier.fillMaxWidth(),
                            fontSize = 18.sp,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                },
                ready = config is SaleConfig.Ready,
                onAbort = onEdit,
                onSubmit = onConfirm,
            )
        }
    }
}
