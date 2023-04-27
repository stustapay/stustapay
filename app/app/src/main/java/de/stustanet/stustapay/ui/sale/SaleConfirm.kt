package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.TabRowDefaults.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar

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

                SaleConfirmItem(
                    name = "Preis",
                    price = checkedSale.total_price,
                    fontSize = 35.sp,
                )
                Divider(modifier = Modifier.padding(bottom = 10.dp))
            }
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .padding(bottom = paddingValues.calculateBottomPadding())
                    .padding(horizontal = 10.dp)
                    .fillMaxSize()
            ) {

                if (checkedSale.used_vouchers > 0) {
                    item {
                        SaleConfirmItem(
                            name = "Gutscheine",
                            quantity = checkedSale.used_vouchers,
                        )
                    }
                }

                for (lineItem in checkedSale.line_items) {
                    item {
                        SaleConfirmLineItem(
                            lineItem = lineItem
                        )
                    }
                }
            }
        },
        bottomBar = {
            SaleBottomBar(
                abortText = "↢ Edit",
                status = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        if (checkedSale.new_voucher_balance > 0) {
                            SaleConfirmItem(
                                name = "übrige Gutscheine",
                                quantity = checkedSale.new_voucher_balance,
                            )
                        }
                        SaleConfirmItem(
                            name = "neues Guthaben",
                            price = checkedSale.new_balance,
                        )
                        Divider(modifier = Modifier.padding(top = 10.dp))
                        Text(
                            text = status,
                            modifier = Modifier.fillMaxWidth(),
                            fontSize = 18.sp,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                },
                saleConfig = orderConfig,
                onAbort = onEdit,
                onSubmit = onConfirm,
            )
        }
    )
}