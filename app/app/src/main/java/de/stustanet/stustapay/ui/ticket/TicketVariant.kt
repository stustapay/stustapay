package de.stustanet.stustapay.ui.ticket

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign

/** selection which ticket to take */
@Composable
fun TicketVariant(
    modifier: Modifier = Modifier,
    viewModel: TicketViewModel
) {
    Column(modifier = modifier.fillMaxSize()) {
        for (variant in TicketVariant.values()) {
            Row(modifier = Modifier.fillMaxWidth()) {
                // TODO multi-ticket selections?
                Text(
                    "%.02f".format(variant.price.toDouble() / 100),
                    textAlign = TextAlign.Right,
                    modifier = Modifier.weight(0.3f)
                )
                Button(
                    onClick = { viewModel.selectTicket(variant) },
                    modifier = Modifier.weight(0.7f)
                ) {
                    Text(variant.description)
                }
            }
        }
    }
}