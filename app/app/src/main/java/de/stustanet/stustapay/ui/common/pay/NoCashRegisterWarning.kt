package de.stustanet.stustapay.ui.common.pay

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Card
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.stustanet.stustapay.R

@Composable
fun NoCashRegisterWarning(
    modifier: Modifier = Modifier,
    bigStyle: Boolean = false,
) {
    Card(
        modifier = modifier,
        backgroundColor = MaterialTheme.colors.error,
        elevation = 8.dp,
    ) {
        Box(
            modifier = Modifier
                .padding(4.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    stringResource(R.string.no_cash_register),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colors.onError,
                    style = if (bigStyle) {MaterialTheme.typography.h3 } else {MaterialTheme.typography.h5}
                )
            }
        }
    }
}