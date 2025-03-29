package de.stustapay.stustapay.ui.payinout.topup

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.ErrorScreen

@Composable
fun TopUpError(
    onDismiss: () -> Unit,
    viewModel: TopUpViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()

    ErrorScreen(
        modifier = Modifier.fillMaxSize(),
        onDismiss = onDismiss
    ) {
        Text(text = stringResource(R.string.error), fontSize = 30.sp)

        Text(status, fontSize = 24.sp)
    }
}