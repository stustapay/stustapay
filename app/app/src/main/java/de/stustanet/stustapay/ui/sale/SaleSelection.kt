package de.stustanet.stustapay.ui.sale

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
import de.stustanet.stustapay.ui.common.pay.ProductSelectionBottomBar
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon
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
    val status by viewModel.status.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

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

            // if we only have one free price item to sell
            // directly show the number keyboard.
            if (saleConfig.buttons.size == 1 &&
                saleConfig.buttons.all { it.value.price is SaleItemPrice.FreePrice }
            ) {
                val button = saleConfig.buttons.values.last()
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
                ready = saleConfig.ready,
                onAbort = {
                    scope.launch {
                        viewModel.clearSale()
                    }
                },
                onSubmit = {
                    scope.launch {
                        viewModel.checkSale()
                    }
                },
            )
        }
    )
}