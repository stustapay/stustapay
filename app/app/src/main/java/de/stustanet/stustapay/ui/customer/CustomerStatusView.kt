package de.stustanet.stustapay.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.chipscan.NfcScanCard
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch
import java.text.DecimalFormat

@Preview
@Composable
fun CustomerStatusView(
    leaveView: () -> Unit = {},
    viewModel: CustomerStatusViewModel = hiltViewModel(),
) {
    val nav = rememberNavController()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val swapVisible by viewModel.swapVisible.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    NavScaffold(
        title = { Text(stringResource(R.string.customer_title)) },
        navigateBack = leaveView
    ) {
        NavHost(navController = nav, startDestination = CustomerStatusNavDests.Scan.route) {
            composable(CustomerStatusNavDests.Scan.route) {
                Box(modifier = Modifier.padding(20.dp)) {
                    NfcScanCard(onScan = {
                        scope.launch {
                            viewModel.setNewTagId(it.uid)
                            nav.navigateTo(CustomerStatusNavDests.Display.route)
                        }
                    })
                }
            }

            composable(CustomerStatusNavDests.Display.route) {
                Scaffold(
                    content = {
                        Box(modifier = Modifier.padding(it)) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(10.dp)
                            ) {
                                if (uiState.customer is CustomerStatusRequestState.Done) {
                                    val customer =
                                        (uiState.customer as CustomerStatusRequestState.Done).account

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(stringResource(R.string.customer_id), fontSize = 24.sp)
                                        Text(customer.id.toString(), fontSize = 36.sp)
                                    }

                                    Divider()

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            stringResource(R.string.customer_name),
                                            fontSize = 24.sp
                                        )
                                        Text(customer.name ?: "no name", fontSize = 36.sp)
                                    }

                                    Divider()

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            stringResource(R.string.customer_cash),
                                            fontSize = 24.sp
                                        )
                                        Text(
                                            "${DecimalFormat("#.00").format(customer.balance)}€",
                                            fontSize = 36.sp
                                        )
                                    }

                                    Divider()

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            stringResource(R.string.customer_vouchers),
                                            fontSize = 24.sp
                                        )
                                        Text(customer.vouchers.toString(), fontSize = 36.sp)
                                    }

                                    Divider()

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            stringResource(R.string.customer_comment),
                                            fontSize = 24.sp
                                        )
                                    }

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(customer.comment ?: "", fontSize = 36.sp)
                                    }
                                }
                            }
                        }
                    },
                    bottomBar = {
                        Column {
                            Spacer(modifier = Modifier.height(10.dp))
                            Divider()
                            Spacer(modifier = Modifier.height(10.dp))
                            Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
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
                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp)
                            ) {
                                Button(
                                    modifier = Modifier
                                        .weight(1.0f),
                                    onClick = {
                                        viewModel.idleState()
                                        nav.navigateTo(CustomerStatusNavDests.Scan.route)
                                    }
                                ) {
                                    Text(
                                        stringResource(R.string.common_action_scan),
                                        fontSize = 24.sp
                                    )
                                }

                                if (swapVisible) {
                                    Button(
                                        modifier = Modifier
                                            .padding(start = 10.dp)
                                            .weight(0.8f),
                                        onClick = {
                                            viewModel.idleState()
                                            nav.navigateTo(CustomerStatusNavDests.Swap.route)
                                        }
                                    ) {
                                        Text(
                                            stringResource(R.string.customer_swap),
                                            fontSize = 24.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                )
            }

            composable(CustomerStatusNavDests.Swap.route) {
                CustomerStatusSwapView(
                    { nav.navigateTo(CustomerStatusNavDests.Scan.route) },
                    viewModel
                )
            }
        }
    }
}

enum class CustomerStatusNavDests(val route: String) {
    Scan("scan"),
    Display("display"),
    Swap("swap"),
}
