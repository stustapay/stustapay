package de.stustapay.stustapay.ui.ticket


import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.LocalActivity
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.api.models.Ticket
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.ButtonListItem


@Composable
fun TicketListItem(
    scannedTicket: ScannedTicket,
    modifier: Modifier = Modifier,
    setTopUp: (() -> Unit)?,
    setTicketVoucher: (() -> Unit)?,
) {
    ButtonListItem(
        modifier = modifier,
        icon = {
            Icon(
                Icons.Filled.LocalActivity,
                contentDescription = null,
                modifier = Modifier.size(35.dp)
            )
        },
        text = {
            Column {
                Row {
                    Text(
                        scannedTicket.nfcTag.pin.orEmpty(),
                        style = MaterialTheme.typography.overline,
                        modifier = Modifier.weight(0.6f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Row {
                    val ticketPrice = "%.2f€".format(scannedTicket.ticket.totalPrice)

                    Text(
                        ticketPrice,
                        style = MaterialTheme.typography.body2,
                        modifier = Modifier
                            .weight(0.4f)
                            .padding(end = 4.dp),
                        textAlign = TextAlign.Right,
                    )

                    Text(
                        scannedTicket.ticket.name,
                        style = MaterialTheme.typography.body2,
                        modifier = Modifier.weight(0.6f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                if (scannedTicket.accountBalance != null && scannedTicket.accountBalance > 0) {
                    val accountBalance = "%.2f€".format(scannedTicket.accountBalance)
                    Row {
                        Text(
                            accountBalance,
                            style = MaterialTheme.typography.body2,
                            modifier = Modifier
                                .weight(0.4f)
                                .padding(end = 4.dp),
                            textAlign = TextAlign.Right,
                        )
                        Text(
                            stringResource(R.string.customer_in_account),
                            style = MaterialTheme.typography.body2,
                            modifier = Modifier.weight(0.6f),
                        )
                    }
                }

                if (setTopUp != null) {
                    val plannedTopUp = "%.2f€".format(scannedTicket.plannedTopUp)

                    Row {
                        Text(
                            plannedTopUp,
                            style = MaterialTheme.typography.body2,
                            modifier = Modifier
                                .weight(0.4f)
                                .padding(end = 4.dp),
                            textAlign = TextAlign.Right,
                        )
                        Text(
                            stringResource(R.string.common_topup),
                            style = MaterialTheme.typography.body2,
                            modifier = Modifier.weight(0.6f),
                        )
                    }
                }
            }
        },
        buttons = {
            Row {
                if (setTopUp != null) {
                    IconButton(
                        modifier = Modifier
                            .size(65.dp),
                        onClick = setTopUp,
                    ) {
                        Icon(
                            modifier = Modifier
                                .size(50.dp),
                            imageVector = Icons.Filled.AddShoppingCart,
                            contentDescription = null,
                        )
                    }
                }

                if (setTicketVoucher != null) {
                    IconButton(
                        modifier = Modifier
                            .size(65.dp),
                        onClick = setTicketVoucher,
                        enabled = scannedTicket.voucherToken == null,
                    ) {
                        Icon(
                            modifier = Modifier
                                .size(50.dp),
                            imageVector = Icons.Filled.QrCodeScanner,
                            contentDescription = null,
                        )
                    }
                }
            }
        },
    )
}

@Preview(showBackground = true)
@Composable
fun PreviewTicketListItem() {
    TicketListItem(
        scannedTicket = ScannedTicket(
            nfcTag = NfcTag(BigInteger.fromInt(1337), "SECRETPIN"),
            ticket = Ticket(
                name = "Ticket-Name",
                price = 13.37,
                taxRateId = BigInteger.fromInt(2),
                restrictions = listOf(),
                isLocked = true,
                initialTopUpAmount = 0.0,
                nodeId = BigInteger.fromInt(42),
                id = BigInteger.fromInt(123),
                taxName = "USt",
                taxRate = 0.19,
                totalPrice = 13.37,
            ),
            accountBalance = 30.0,
            plannedTopUp = 10.0,
            voucherToken = "VOUCHERCODE",
        ),
        setTopUp = {},
        setTicketVoucher = {},
    )
}