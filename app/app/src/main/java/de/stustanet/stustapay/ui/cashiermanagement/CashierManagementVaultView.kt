package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.priceselect.PriceSelection
import kotlinx.coroutines.launch

@Composable
fun CashierManagementVaultView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf(0u) }

    Column {
        PriceSelection(onEnter = { amount = it }, onClear = { amount = 0u })

        Spacer(modifier = Modifier.height(20.dp))
        Divider()
        Spacer(modifier = Modifier.height(20.dp))

        Row(modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = {
                    scope.launch {
                        viewModel.bookVaultToBag(amount.toDouble() / 100.0)
                    }
                }, modifier = Modifier
                    .weight(1.0f)
                    .padding(5.dp)
                    .height(140.dp)
            ) {
                Text("Take\nVault -> Bag", fontSize = 24.sp, textAlign = TextAlign.Center)
            }

            Button(
                onClick = {
                    scope.launch {
                        viewModel.bookBagToVault(amount.toDouble() / 100.0)
                    }
                }, modifier = Modifier
                    .weight(1.0f)
                    .padding(5.dp)
                    .height(140.dp)
            ) {
                Text("Return\nBag -> Vault", fontSize = 24.sp, textAlign = TextAlign.Center)
            }
        }
    }
}