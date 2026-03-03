package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.Spinner
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBottomActions
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceCountdownCard
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePanel
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceActionButton
import de.stustapay.stustapay.ui.nav.NavDest
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val SELF_SERVICE_BALANCE_SUCCESS_RETURN_SECONDS = 10
private const val SELF_SERVICE_BALANCE_ERROR_RETURN_SECONDS = 8

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

    if (isSelfService) {
        SelfServiceAccountStatus(
            uiState = uiState,
            showComment = commentVisible,
            onRetry = {
                viewModel.idleState()
                navigateTo(CustomerStatusNavDests.scan)
            },
            onBackHome = {
                viewModel.idleState()
                onFinished()
            }
        )
        return
    }

    LaunchedEffect(uiState.customer, isSelfService) {
        when (uiState.customer) {
            is CustomerStatusRequestState.Done,
            is CustomerStatusRequestState.DoneDetails -> {
                delay(5000)
                navigateTo(CustomerStatusNavDests.scan)
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
                navigateTo(CustomerStatusNavDests.scan)
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

                    is CustomerStatusRequestState.Done,
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
private fun SelfServiceAccountStatus(
    uiState: CustomerStatusUiState,
    showComment: Boolean,
    onRetry: () -> Unit,
    onBackHome: () -> Unit,
) {
    val profile = rememberSelfServiceDeviceProfile()
    val autoReturnSeconds = when (uiState.customer) {
        is CustomerStatusRequestState.Done,
        is CustomerStatusRequestState.DoneDetails -> SELF_SERVICE_BALANCE_SUCCESS_RETURN_SECONDS
        is CustomerStatusRequestState.Failed -> SELF_SERVICE_BALANCE_ERROR_RETURN_SECONDS
        else -> null
    }

    var remainingSeconds by rememberSaveable(autoReturnSeconds) {
        mutableIntStateOf(autoReturnSeconds ?: 0)
    }

    LaunchedEffect(autoReturnSeconds) {
        if (autoReturnSeconds == null) {
            return@LaunchedEffect
        }

        remainingSeconds = autoReturnSeconds
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
        onBackHome()
    }

    SelfServiceBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    horizontal = profile.contentPaddingHorizontal,
                    vertical = profile.contentPaddingVertical
                ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            val subtitleColor = when (uiState.customer) {
                is CustomerStatusRequestState.Failed -> SelfServicePalette.errorMuted
                is CustomerStatusRequestState.Fetching -> SelfServicePalette.accent
                else -> SelfServicePalette.subtitle
            }

            val subtitle = when (uiState.customer) {
                is CustomerStatusRequestState.Failed -> stringResource(R.string.failed_fetching)
                is CustomerStatusRequestState.Fetching -> stringResource(R.string.selfservice_balance_loading)
                is CustomerStatusRequestState.Done,
                is CustomerStatusRequestState.DoneDetails -> stringResource(R.string.nfc_scan_success)
                is CustomerStatusRequestState.Idle -> stringResource(R.string.selfservice_scan_balance_subtitle)
            }

            SelfServiceHeadline(
                title = stringResource(R.string.selfservice_check_balance),
                subtitle = subtitle,
                subtitleColor = subtitleColor,
                titleFontSize = profile.headlineTitleSize,
                subtitleFontSize = profile.headlineSubtitleSize
            )

            when (val customer = uiState.customer) {
                is CustomerStatusRequestState.Done -> {
                    SelfServiceBalanceResult(
                        amount = customer.account.balance,
                        customerName = customer.account.name,
                        vouchers = customer.account.vouchers.toString(),
                        restriction = customer.account.restriction?.toString(),
                        comment = if (showComment) customer.account.comment else null,
                        amountFontSize = profile.amountValueSize
                    )
                }

                is CustomerStatusRequestState.DoneDetails -> {
                    SelfServiceBalanceResult(
                        amount = customer.account.balance,
                        customerName = customer.account.name,
                        vouchers = customer.account.vouchers.toString(),
                        restriction = customer.account.restriction?.toString(),
                        comment = if (showComment) customer.account.comment else null,
                        amountFontSize = profile.amountValueSize
                    )
                }

                is CustomerStatusRequestState.Fetching -> {
                    SelfServiceScanLoading(isSmallScreen = profile.isSmallScreen)
                }

                is CustomerStatusRequestState.Failed -> {
                    SelfServiceScanError(
                        message = customer.msg,
                        isSmallScreen = profile.isSmallScreen
                    )
                }

                is CustomerStatusRequestState.Idle -> {
                    SelfServiceScanIdle(isSmallScreen = profile.isSmallScreen)
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            when (uiState.customer) {
                is CustomerStatusRequestState.Done,
                is CustomerStatusRequestState.DoneDetails -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SelfServiceCountdownCard(
                            label = stringResource(R.string.topup_auto_return_countdown, remainingSeconds),
                            subLabel = stringResource(R.string.selfservice_auto_return),
                            progress = remainingSeconds.toFloat() / SELF_SERVICE_BALANCE_SUCCESS_RETURN_SECONDS.toFloat(),
                            modifier = Modifier.weight(1f)
                        )
                        SelfServiceActionButton(
                            text = stringResource(R.string.topup_back_now),
                            onClick = onBackHome,
                            modifier = Modifier.weight(0.55f),
                            primary = false,
                            fontSize = profile.buttonTextSize
                        )
                    }
                }

                is CustomerStatusRequestState.Failed -> {
                    SelfServiceBottomActions(
                        primaryText = stringResource(R.string.topup_try_again),
                        onPrimary = onRetry,
                        secondaryText = stringResource(R.string.topup_back_to_start),
                        onSecondary = onBackHome,
                        buttonTextSize = profile.buttonTextSize
                    )
                    SelfServiceCountdownCard(
                        label = stringResource(R.string.topup_auto_return_countdown, remainingSeconds),
                        subLabel = stringResource(R.string.selfservice_auto_return),
                        progress = remainingSeconds.toFloat() / SELF_SERVICE_BALANCE_ERROR_RETURN_SECONDS.toFloat(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                is CustomerStatusRequestState.Fetching -> {
                    Text(
                        text = stringResource(R.string.topup_please_wait),
                        color = SelfServicePalette.subtitle,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                is CustomerStatusRequestState.Idle -> {
                    SelfServiceActionButton(
                        text = stringResource(R.string.topup_back_to_start),
                        onClick = onBackHome,
                        modifier = Modifier.fillMaxWidth(),
                        primary = false,
                        fontSize = profile.buttonTextSize
                    )
                }
            }
        }
    }
}

@Composable
private fun SelfServiceBalanceResult(
    amount: Double,
    customerName: String?,
    vouchers: String,
    restriction: String?,
    comment: String?,
    amountFontSize: androidx.compose.ui.unit.TextUnit
) {
    Text(
        text = "€ ${"%.2f".format(amount)}",
        color = SelfServicePalette.title,
        fontSize = amountFontSize,
        fontWeight = FontWeight.ExtraBold
    )

    SelfServicePanel(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = "${stringResource(R.string.customer_name)}: ${customerName ?: "-"}",
                color = SelfServicePalette.title,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "${stringResource(R.string.customer_vouchers)}: $vouchers",
                color = SelfServicePalette.subtitle,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            if (!restriction.isNullOrBlank()) {
                Text(
                    text = "${stringResource(R.string.customer_restriction)}: $restriction",
                    color = SelfServicePalette.subtitle,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            if (!comment.isNullOrBlank()) {
                Text(
                    text = "${stringResource(R.string.customer_comment)}: $comment",
                    color = SelfServicePalette.subtitle,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun SelfServiceScanIdle(isSmallScreen: Boolean) {
    SelfServicePanel(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 8.dp else 12.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.NearMe,
                contentDescription = null,
                tint = SelfServicePalette.accent,
                modifier = Modifier.size(if (isSmallScreen) 46.dp else 64.dp)
            )
            Text(
                text = stringResource(R.string.selfservice_scan_balance_subtitle),
                color = SelfServicePalette.title,
                fontSize = if (isSmallScreen) 18.sp else 22.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun SelfServiceScanLoading(isSmallScreen: Boolean) {
    SelfServicePanel(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 10.dp else 14.dp)
        ) {
            Text(
                text = stringResource(R.string.selfservice_balance_loading),
                color = SelfServicePalette.title,
                fontSize = if (isSmallScreen) 24.sp else 30.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Box(
                modifier = Modifier
                    .size(if (isSmallScreen) 92.dp else 120.dp)
                    .background(SelfServicePalette.backgroundBottom, CircleShape)
                    .border(2.dp, SelfServicePalette.panelBorder, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.NearMe,
                    contentDescription = null,
                    tint = SelfServicePalette.success,
                    modifier = Modifier.size(if (isSmallScreen) 34.dp else 46.dp)
                )
            }
            Spinner()
        }
    }
}

@Composable
private fun SelfServiceScanError(message: String, isSmallScreen: Boolean) {
    SelfServicePanel(
        modifier = Modifier.fillMaxWidth(),
        borderColor = SelfServicePalette.error,
        backgroundColor = Color(0xFF4B1F2C)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Filled.ErrorOutline,
                contentDescription = null,
                tint = SelfServicePalette.error,
                modifier = Modifier.size(34.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = stringResource(R.string.common_status_failed),
                    color = SelfServicePalette.errorMuted,
                    fontSize = if (isSmallScreen) 22.sp else 26.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    text = message,
                    color = SelfServicePalette.errorMuted,
                    style = MaterialTheme.typography.body1
                )
            }
        }
    }
}
