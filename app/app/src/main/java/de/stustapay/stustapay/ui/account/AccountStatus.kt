package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.libssp.ui.common.Spinner
import de.stustapay.stustapay.ui.nav.NavDest


@Composable
fun AccountStatus(
    navigateTo: (NavDest) -> Unit,
    viewModel: AccountViewModel
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val commentVisible by viewModel.commentVisible.collectAsStateWithLifecycle()

    Scaffold(
        content = {
            CloseContent(
                modifier = Modifier
                    .padding(it)
                    .padding(10.dp),
                onClose = {
                    viewModel.idleState()
                    navigateTo(CustomerStatusNavDests.scan)
                },
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
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
                    }
                }
            }
        },
        bottomBar = {
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

                        is CustomerStatusRequestState.Failed -> {
                            state.msg
                        }
                    }
                    Text(text, fontSize = 24.sp)
                }
            }
        }
    )
}
