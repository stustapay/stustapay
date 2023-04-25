package de.stustanet.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.nav.TopAppBar

/**
 * View for displaying available purchase items
 */
@Composable
fun SaleConfirm(
    viewModel: SaleViewModel,
    onAbort: () -> Unit,
    onSubmit: () -> Unit,
) {
    val orderConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val saleDraft by viewModel.saleStatus.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()

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
            Column {
                TopAppBar(title = { Text(orderConfig.tillName) })

                SalePrice(checkedSale.total_price)
            }
        },
        content = { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())
            ) {

                if (checkedSale.used_vouchers > 0) {
                    item {
                        Text(
                            text = "Vouchers: ${checkedSale.used_vouchers}",
                            modifier = Modifier.fillMaxWidth(),
                            fontSize = 30.sp,
                        )
                    }
                }

                for (lineItem in checkedSale.line_items) {
                    item {
                        SaleConfirmItem(
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
                    Column {
                        if (checkedSale.new_voucher_balance > 0) {
                            Text(
                                text = "Vouchers left: ${checkedSale.new_voucher_balance.toString().padStart(5)}",
                                modifier = Modifier.fillMaxWidth(),
                                fontSize = 20.sp,
                            )
                        }
                        Text(
                            text = "Money left: ${"%.02f".format(checkedSale.new_balance).padStart(5)}",
                            modifier = Modifier.fillMaxWidth(),
                            fontSize = 20.sp,
                        )
                        Text(
                            text = status,
                            modifier = Modifier.fillMaxWidth(),
                            fontSize = 18.sp,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                },
                saleConfig = orderConfig,
                onAbort = onAbort,
                onSubmit = onSubmit,
            )
        }
    )
}