package de.stustapay.stustapay.ui.payinout.topup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBottomActions
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceCountdownCard
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePanel
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceSectionHeader
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import kotlinx.coroutines.delay

private const val SELF_SERVICE_ERROR_RETURN_SECONDS = 10

@Composable
fun TopUpError(
    onDismiss: () -> Unit,
    onLeaveSelfService: (() -> Unit)? = null,
    viewModel: TopUpViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val isSelfService = topUpConfig.hasOnlyTopUpPrivilege()
    var remainingSeconds by rememberSaveable(isSelfService) {
        mutableIntStateOf(SELF_SERVICE_ERROR_RETURN_SECONDS)
    }

    LaunchedEffect(isSelfService) {
        if (!isSelfService) {
            return@LaunchedEffect
        }

        remainingSeconds = SELF_SERVICE_ERROR_RETURN_SECONDS
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
        onDismiss()
        onLeaveSelfService?.invoke()
    }

    if (isSelfService) {
        val profile = rememberSelfServiceDeviceProfile()
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
                SelfServiceSectionHeader(
                    title = stringResource(R.string.topup_error_title),
                    subtitle = status,
                    subtitleColor = SelfServicePalette.errorMuted,
                    titleFontSize = profile.headlineTitleSize,
                    subtitleFontSize = profile.headlineSubtitleSize,
                    showLanguageSelector = false
                )

                SelfServicePanel(
                    modifier = Modifier.fillMaxWidth(),
                    borderColor = SelfServicePalette.error,
                    backgroundColor = SelfServicePalette.errorPanel
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = stringResource(R.string.topup_error_title),
                            color = SelfServicePalette.errorMuted,
                            fontSize = if (profile.isSmallScreen) 24.sp else 30.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = "${stringResource(R.string.error)}: $status",
                            color = SelfServicePalette.errorMuted,
                            fontSize = if (profile.isSmallScreen) 14.sp else 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${stringResource(R.string.topup_try_again)} / ${stringResource(R.string.topup_back_to_start)}",
                            color = SelfServicePalette.errorMuted,
                            fontSize = if (profile.isSmallScreen) 13.sp else 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                SelfServiceBottomActions(
                    primaryText = stringResource(R.string.topup_try_again),
                    onPrimary = onDismiss,
                    secondaryText = stringResource(R.string.topup_back_to_start),
                    onSecondary = {
                        onDismiss()
                        onLeaveSelfService?.invoke()
                    },
                    buttonTextSize = profile.buttonTextSize
                )

                SelfServiceCountdownCard(
                    label = stringResource(R.string.topup_error_auto_return_countdown, remainingSeconds),
                    subLabel = stringResource(R.string.selfservice_auto_return),
                    progress = remainingSeconds.toFloat() / SELF_SERVICE_ERROR_RETURN_SECONDS.toFloat(),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        return
    }

    OperatorTopUpError(
        terminalTitle = topUpConfig.title().title,
        footerHint = status,
        onDismiss = onDismiss,
    )
}
