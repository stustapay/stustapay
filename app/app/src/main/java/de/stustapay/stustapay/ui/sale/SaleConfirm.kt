package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.TabRowDefaults.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import de.stustapay.stustapay.ui.common.pay.ProductSelectionBottomBar
import de.stustapay.stustapay.ui.common.pay.ProductConfirmLineItem
import de.stustapay.stustapay.ui.nav.TopAppBar
import de.stustapay.stustapay.R

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleConfirm(
    viewModel: SaleViewModel,
    onEdit: () -> Unit,
    onConfirm: () -> Unit,
) {
    val orderConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleDraft by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()

    val checkedSale = saleDraft.checkedSale
    if (checkedSale == null) {
        Column {
            Text(status)
            Text("no sale check present!")
        }
        return
    }

    Scaffold(
        topBar = {
            Column(modifier = Modifier.fillMaxWidth()) {
                TopAppBar(title = { Text(saleConfig.tillName) })
                Column(modifier = Modifier.padding(horizontal = 10.dp)) {
                    ProductConfirmItem(
                        name = stringResource(R.string.price),
                        price = checkedSale.total_price,
                        bigStyle = true,
                    )
                    Divider(thickness = 2.dp)
                    ProductConfirmItem(
                        name = stringResource(R.string.credit_left),
                        price = checkedSale.new_balance,
                    )
                    if (checkedSale.new_voucher_balance > 0) {
                        ProductConfirmItem(
                            name = stringResource(R.string.remaining_vouchers),
                            quantity = checkedSale.new_voucher_balance,
                        )
                    }
                    Divider(thickness = 2.dp)
                }
            }
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .padding(paddingValues)
                    .padding(horizontal = 10.dp)
                    .fillMaxSize()
            ) {

                if (checkedSale.used_vouchers > 0) {
                    item {
                        ProductConfirmItem(
                            name = stringResource(R.string.used_vouchers),
                            quantity = checkedSale.used_vouchers,
                        )
                    }
                }

                for (lineItem in checkedSale.line_items) {
                    item {
                        ProductConfirmLineItem(
                            lineItem = lineItem
                        )
                    }
                }
            }
        },
        bottomBar = {
            ProductSelectionBottomBar(
                abortText = stringResource(R.string.edit),
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
                ready = orderConfig.ready,
                onAbort = onEdit,
                onSubmit = onConfirm,
            )
        }
    )
}