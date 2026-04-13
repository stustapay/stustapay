package de.stustapay.stustapay.display

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.api.models.CompletedSale
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem

/**
 * Unused reference composables kept for a possible future Compose-based customer display.
 */
@Composable
internal fun WelcomeScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome",
            fontSize = 32.sp,
            color = MaterialTheme.colors.primary
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Please scan your tag or make a selection",
            fontSize = 24.sp
        )
    }
}

@Composable
internal fun SaleCompletedScreen(sale: CompletedSale) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Purchase Complete",
            fontSize = 32.sp,
            color = MaterialTheme.colors.primary,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        ProductConfirmItem(
            name = "Total Price",
            price = sale.totalPrice,
            bigStyle = true,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (sale.newBalance != null) {
            ProductConfirmItem(
                name = "New Balance",
                price = sale.newBalance,
                bigStyle = true,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        if (sale.newVoucherBalance > 0) {
            ProductConfirmItem(
                name = "Remaining Vouchers",
                quantity = sale.newVoucherBalance.intValue(),
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
    }
}

@Composable
internal fun TopUpCompletedScreen(newBalance: String, topUpAmount: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Top-Up Complete",
            fontSize = 32.sp,
            color = MaterialTheme.colors.primary,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        Text(
            text = "Amount Added: $topUpAmount",
            fontSize = 24.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Text(
            text = "New Balance: $newBalance",
            fontSize = 28.sp,
            color = MaterialTheme.colors.primary,
            modifier = Modifier.padding(top = 16.dp)
        )
    }
} 
