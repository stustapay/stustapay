package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.LaunchedEffect
import de.stustapay.libssp.ui.common.Spinner
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.stustapay.ui.nav.NavDest
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

@Composable
fun AccountStatus(
    navigateTo: (NavDest) -> Unit,
    viewModel: AccountViewModel,
    isSelfService: Boolean = false,
    onFinished: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val commentVisible by viewModel.commentVisible.collectAsStateWithLifecycle()

    // Auto-return after showing a result
    LaunchedEffect(uiState.customer, isSelfService) {
        when (uiState.customer) {
            is CustomerStatusRequestState.Done,
            is CustomerStatusRequestState.DoneDetails -> {
                delay(5000)
                if (isSelfService) {
                    onFinished()
                } else {
                    navigateTo(CustomerStatusNavDests.scan)
                }
            }
            else -> Unit
        }
    }
    
    Scaffold(content = {
        CloseContent(
            modifier = Modifier
                .padding(it)
                .padding(10.dp),
            onClose = {
                viewModel.idleState()
                if (isSelfService) {
                    onFinished()
                } else {
                    navigateTo(CustomerStatusNavDests.scan)
                }
            },
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                when (val customer = uiState.customer) {
                    is CustomerStatusRequestState.Failed -> {
                        Text(stringResource(R.string.failed_fetching))
                    }

                    is CustomerStatusRequestState.Idle -> {}

                    is CustomerStatusRequestState.Fetching -> {
                        Spinner()
                    }

                    is CustomerStatusRequestState.Done -> {
                        val account = customer.account
                        AccountProperties(
                            account = account,
                            showComment = commentVisible,
                        )
                    }

                    is CustomerStatusRequestState.DoneDetails -> {
                        val account = customer.account
                        AccountProperties(
                            account = account,
                            showComment = commentVisible,
                        )
                    }
                }
            }
        }
    }, bottomBar = {
        Column {
            Divider(modifier = Modifier.padding(vertical = 10.dp))

            // Only show the Transaction History button if the user has permission to view customer orders
            if (uiState.canViewCustomerOrders) {
                Button(modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp),
                    onClick = {
                        scope.launch {
                            viewModel.fetchCustomerOrders()
                            navigateTo(CustomerStatusNavDests.details)
                        }
                    }) {
                    Text(stringResource(R.string.customer_details))
                }
                
                Divider(modifier = Modifier.padding(vertical = 10.dp))
            }

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
