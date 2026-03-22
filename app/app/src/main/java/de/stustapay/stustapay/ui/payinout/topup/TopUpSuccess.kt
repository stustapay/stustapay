package de.stustapay.stustapay.ui.payinout.topup

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceActionButton
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceBackground
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceCountdownCard
import de.stustapay.stustapay.ui.common.selfservice.SelfServiceHeadline
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePanel
import de.stustapay.stustapay.ui.common.selfservice.rememberSelfServiceDeviceProfile
import kotlinx.coroutines.delay

private const val SELF_SERVICE_SUCCESS_RETURN_SECONDS = 8

@Composable
fun TopUpSuccess(onDismiss: () -> Unit, viewModel: TopUpViewModel) {
    val topUpCompleted by viewModel.topUpCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val isSelfService = topUpConfig.hasOnlyTopUpPrivilege()
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)
    var remainingSeconds by rememberSaveable(isSelfService) {
        mutableIntStateOf(SELF_SERVICE_SUCCESS_RETURN_SECONDS)
    }

    val completedTopUp = topUpCompleted
    if (completedTopUp == null) {
        Text(
            text = stringResource(R.string.topup_missing_success_data),
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            fontSize = 20.sp
        )
        return
    }

    LaunchedEffect(Unit) {
        vibrator?.vibrate(VibrationEffect.createOneShot(450, 180))
    }

    LaunchedEffect(isSelfService) {
        if (!isSelfService) {
            return@LaunchedEffect
        }

        remainingSeconds = SELF_SERVICE_SUCCESS_RETURN_SECONDS
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
        onDismiss()
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
                SelfServiceHeadline(
                    title = stringResource(R.string.topup_success_title),
                    subtitle = stringResource(R.string.topup_success_subtitle),
                    subtitleColor = SelfServicePalette.successMuted,
                    titleFontSize = profile.headlineTitleSize,
                    subtitleFontSize = profile.headlineSubtitleSize
                )

                SelfServicePanel(
                    modifier = Modifier.fillMaxWidth(),
                    borderColor = SelfServicePalette.success,
                    backgroundColor = Color(0xFF174A39)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            androidx.compose.material.Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = null,
                                tint = SelfServicePalette.success,
                                modifier = Modifier.height(28.dp)
                            )
                            Text(
                                text = stringResource(R.string.topup_success_title),
                                color = SelfServicePalette.successMuted,
                                fontSize = if (profile.isSmallScreen) 24.sp else 30.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                        Text(
                            text = "${stringResource(R.string.previous_balance)}: €${"%.2f".format(completedTopUp.oldBalance)}",
                            color = SelfServicePalette.successMuted,
                            fontSize = if (profile.isSmallScreen) 14.sp else 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${stringResource(R.string.topup)}: +€${"%.2f".format(completedTopUp.amount)}",
                            color = SelfServicePalette.successMuted,
                            fontSize = if (profile.isSmallScreen) 14.sp else 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${stringResource(R.string.new_balance)}: €${"%.2f".format(completedTopUp.newBalance)}",
                            color = SelfServicePalette.title,
                            fontSize = if (profile.isSmallScreen) 24.sp else 34.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SelfServiceCountdownCard(
                        label = stringResource(R.string.topup_auto_return_countdown, remainingSeconds),
                        subLabel = stringResource(R.string.selfservice_auto_return),
                        progress = remainingSeconds.toFloat() / SELF_SERVICE_SUCCESS_RETURN_SECONDS.toFloat(),
                        modifier = Modifier.weight(1f)
                    )
                    SelfServiceActionButton(
                        text = stringResource(R.string.topup_back_now),
                        onClick = onDismiss,
                        modifier = Modifier.weight(0.55f),
                        primary = false,
                        fontSize = profile.buttonTextSize
                    )
                }
            }
        }
        return
    }

    OperatorTopUpSuccess(
        terminalTitle = topUpConfig.title().title,
        footerHint = status,
        completedTopUp = completedTopUp,
        onDismiss = onDismiss,
    )
}
