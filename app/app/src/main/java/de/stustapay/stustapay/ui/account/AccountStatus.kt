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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Person
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.Spinner
import de.stustapay.libssp.util.formatCurrencyValue
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.TagItem
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceActionButton
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBottomActions
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceCountdownCard
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePanel
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceSectionHeader
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
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

    OperatorScaffold(
        title = stringResource(R.string.customer_title),
        subtitle = stringResource(R.string.account_status_subtitle),
        icon = Icons.Filled.Person,
        terminalLabel = stringResource(R.string.account_terminal_label),
        footerHint = operatorCustomerStatusText(uiState.customer),
        footerSection = stringResource(R.string.account_footer_section_status),
        footerStatus = operatorCustomerStatusBadge(uiState.customer),
        onBack = {
            viewModel.idleState()
            navigateTo(CustomerStatusNavDests.scan)
        },
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when (val customer = uiState.customer) {
                    is CustomerStatusRequestState.Failed -> {
                        OperatorInfoCard(
                            title = stringResource(R.string.account_lookup_failed),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = customer.msg.ifBlank { stringResource(R.string.failed_fetching) },
                                color = OperatorPalette.subtitle,
                            )
                        }
                    }

                    is CustomerStatusRequestState.Idle -> {
                        OperatorInfoCard(
                            title = stringResource(R.string.account_waiting_customer_tag_title),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = stringResource(R.string.account_waiting_customer_tag_desc),
                                color = OperatorPalette.subtitle,
                            )
                        }
                    }

                    is CustomerStatusRequestState.Fetching -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Spinner()
                        }
                    }

                    is CustomerStatusRequestState.Done -> {
                        OperatorAccountSummary(
                            account = customer.account,
                            showComment = commentVisible,
                        )
                    }

                    is CustomerStatusRequestState.DoneDetails -> {
                        OperatorAccountSummary(
                            account = customer.account,
                            showComment = commentVisible,
                        )
                    }
                }
            }

            if (uiState.canViewCustomerOrders &&
                (uiState.customer is CustomerStatusRequestState.Done || uiState.customer is CustomerStatusRequestState.DoneDetails)
            ) {
                OperatorSecondaryButton(
                    text = stringResource(R.string.customer_details),
                    icon = Icons.AutoMirrored.Filled.List,
                    onClick = {
                        scope.launch {
                            viewModel.fetchCustomerOrders()
                            navigateTo(CustomerStatusNavDests.details)
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun OperatorAccountSummary(
    account: de.stustapay.api.models.Account,
    showComment: Boolean,
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(end = 4.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OperatorPanel(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                account.userTagUid?.let { userTagUid ->
                    TagItem(
                        de.stustapay.libssp.model.NfcTag(userTagUid, null),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Text(
                    text = formatCurrencyValue(account.balance),
                    color = OperatorPalette.title,
                    fontSize = 46.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center,
                )

                Text(
                    text = stringResource(R.string.account_current_balance_label),
                    color = OperatorPalette.subtitle,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium,
                )

                if (account.vouchers > 0) {
                    Text(
                        text = "${account.vouchers} ${stringResource(R.string.customer_vouchers)}",
                        color = OperatorPalette.accent,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }

        OperatorInfoCard(
            title = stringResource(R.string.account_customer_overview),
            modifier = Modifier.fillMaxWidth(),
        ) {
            account.restriction?.let { restriction ->
                OperatorSummaryRow(
                    label = stringResource(R.string.customer_restriction),
                    value = when (restriction.value) {
                        "under_18" -> stringResource(R.string.under_18_years)
                        "under_16" -> stringResource(R.string.under_16_years)
                        else -> restriction.value
                    }
                )
            }

            account.name?.let { name ->
                OperatorSummaryRow(
                    label = stringResource(R.string.customer_name),
                    value = name,
                )
            }

            val comment = account.comment
            if (showComment && !comment.isNullOrEmpty()) {
                OperatorSummaryRow(
                    label = stringResource(R.string.customer_comment),
                    value = comment,
                )
            }
        }
    }
}

@Composable
private fun OperatorSummaryRow(
    label: String,
    value: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = label,
            color = OperatorPalette.subtitle,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
        )
        Text(
            text = value,
            color = OperatorPalette.title,
            fontSize = 24.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
fun operatorCustomerStatusText(state: CustomerStatusRequestState): String {
    return when (state) {
        is CustomerStatusRequestState.Idle -> stringResource(R.string.common_status_idle)
        is CustomerStatusRequestState.Fetching -> stringResource(R.string.common_status_fetching)
        is CustomerStatusRequestState.Done,
        is CustomerStatusRequestState.DoneDetails -> stringResource(R.string.common_status_done)
        is CustomerStatusRequestState.Failed -> state.msg.ifBlank { stringResource(R.string.failed_fetching) }
    }
}

@Composable
private fun operatorCustomerStatusBadge(state: CustomerStatusRequestState): String {
    return when (state) {
        is CustomerStatusRequestState.Idle -> stringResource(R.string.common_status_idle)
        is CustomerStatusRequestState.Fetching -> stringResource(R.string.account_badge_loading)
        is CustomerStatusRequestState.Done,
        is CustomerStatusRequestState.DoneDetails -> stringResource(R.string.account_badge_loaded)
        is CustomerStatusRequestState.Failed -> stringResource(R.string.account_badge_error)
    }
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

            SelfServiceSectionHeader(
                title = stringResource(R.string.selfservice_check_balance),
                subtitle = subtitle,
                subtitleColor = subtitleColor,
                titleFontSize = profile.headlineTitleSize,
                subtitleFontSize = profile.headlineSubtitleSize,
                showLanguageSelector = uiState.customer !is CustomerStatusRequestState.Fetching
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
