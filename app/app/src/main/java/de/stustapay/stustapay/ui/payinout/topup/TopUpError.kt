package de.stustapay.stustapay.ui.payinout.topup

import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.pay.ErrorScreen

@Composable
fun TopUpError(
    onDismiss: () -> Unit,
    viewModel: TopUpViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()

    ErrorScreen(
        onDismiss = onDismiss,
    ) {
        Text(text = "Error:", fontSize = 30.sp)
        Text(status, fontSize = 24.sp)
    }
}