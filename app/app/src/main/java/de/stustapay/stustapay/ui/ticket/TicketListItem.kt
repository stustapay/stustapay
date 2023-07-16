package de.stustapay.stustapay.ui.ticket


import androidx.compose.foundation.layout.size
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.Icon
import androidx.compose.material.ListItem
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp


@OptIn(ExperimentalMaterialApi::class)
@Composable
fun TicketListItem(scannedTicket: ScannedTicket) {
    ListItem(
        text = { Text(scannedTicket.ticket.name) },
        trailing = {
            Text(
                "%.2f€".format(scannedTicket.ticket.price),
                style = MaterialTheme.typography.h4,
            )
        },
        secondaryText = { Text(scannedTicket.tag.toString()) },
        icon = {
            Icon(
                Icons.Filled.DateRange,
                contentDescription = null,
                modifier = Modifier.size(40.dp)
            )
        }
    )
}