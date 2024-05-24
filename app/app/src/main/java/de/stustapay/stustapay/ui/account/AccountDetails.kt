package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.Order
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.stustapay.ui.common.TagItem
import de.stustapay.stustapay.ui.nav.NavDest
import kotlinx.coroutines.launch

@Composable
fun AccountDetails(
    navigateTo: (NavDest) -> Unit, viewModel: AccountViewModel
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(content = {
        CloseContent(
            modifier = Modifier
                .padding(it)
                .fillMaxSize()
                .padding(10.dp),
            onClose = {
                viewModel.idleState()
                navigateTo(CustomerStatusNavDests.scan)
            },
        ) {
            Column {
                val customer = uiState.customer
                if (customer is CustomerStatusRequestState.DoneDetails) {
                    val userTagUid = customer.account.userTagUid
                    if (userTagUid != null) {
                        TagItem(
                            NfcTag(userTagUid, null),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp)
                        )
                    }

                    Divider(modifier = Modifier.padding(vertical = 10.dp))

                    LazyColumn {
                        for (order in customer.orders.reversed()) {
                            item {
                                OrderListEntry(order)
                            }
                        }
                    }
                }
            }
        }
    }, bottomBar = {
        Column {
            Divider(modifier = Modifier.padding(vertical = 10.dp))
            Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp, bottom = 10.dp)) {
                val text = when (val state = uiState.customer) {
                    is CustomerStatusRequestState.Idle -> {
                        stringResource(R.string.common_status_idle)
                    }

                    is CustomerStatusRequestState.Fetching -> {
                        stringResource(R.string.common_status_fetching)
                    }

                    is CustomerStatusRequestState.Done -> {
                        stringResource(R.string.common_status_done)
                    }

                    is CustomerStatusRequestState.DoneDetails -> {
                        stringResource(R.string.common_status_done)
                    }

                    is CustomerStatusRequestState.Failed -> {
                        state.msg
                    }
                }
                Text(text, fontSize = 24.sp)
            }
        }
    })
}

@Composable
fun OrderListEntry(order: Order) {
    Row(modifier = Modifier
        .fillMaxWidth()
        .padding(5.dp)) {
        Text("%.02f€".format(order.totalPrice))
    }
}