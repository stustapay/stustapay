package de.stustapay.stustapay.ui.payinout.payout


import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.Image
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
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ionspin.kotlin.bignum.integer.toBigInteger
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.api.models.CompletedPayOut
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import de.stustapay.stustapay.ui.device.DeviceConfigProvider
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint
import java.time.OffsetDateTime
import java.util.UUID

@Preview
@Composable
fun PreviewCashOutSuccessDialog() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CashOutSuccessCard(
            onDismiss = {},
            completedPayOut = CompletedPayOut(
                uuid = UUID.randomUUID(),
                customerTagUid = 0.toBigInteger(),
                amount = -13.37,
                customerAccountId = 0.toBigInteger(),
                oldBalance = 42.0,
                newBalance = 30.5,
                bookedAt = OffsetDateTime.now(),
                cashierId = 0.toBigInteger(),
                tillId = 0.toBigInteger(),
            )
        )
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun PayOutSuccessDialog(
    onDismiss: () -> Unit = {},
    completedPayOut: CompletedPayOut,
) {
    // Get DeviceConfigProvider using Hilt EntryPoint
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    
    val deviceConfig = deviceConfigProvider.getDeviceConfig()
    
    Dialog(
        onDismissRequest = {
            onDismiss()
        },
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        // Use full screen width with proper centering for small screens
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CashOutSuccessCard(
                modifier = Modifier.let {
                    // Apply scaling for small screens
                    if (deviceConfig.isSmallScreen) {
                        it.fillMaxWidth(0.85f)  // Use 85% of screen width
                    } else {
                        it.fillMaxWidth(0.95f).padding(horizontal = 10.dp)  // Use 95% of screen width for normal screens
                    }
                },
                onDismiss = onDismiss,
                completedPayOut = completedPayOut,
                isSmallScreen = deviceConfig.isSmallScreen
            )
        }
    }
}


@Composable
fun CashOutSuccessCard(
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit,
    completedPayOut: CompletedPayOut,
    isSmallScreen: Boolean = false
) {
    val haptic = LocalHapticFeedback.current
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    // Adjust sizes based on screen size
    val iconSize = if (isSmallScreen) 80.dp else 120.dp
    val spacerHeight = if (isSmallScreen) 12.dp else 20.dp
    val cornerRadius = if (isSmallScreen) 8.dp else 10.dp
    val elevation = if (isSmallScreen) 4.dp else 8.dp
    val buttonHeight = if (isSmallScreen) 50.dp else 70.dp
    val dividerThickness = if (isSmallScreen) 1.dp else 2.dp

    Card(
        shape = RoundedCornerShape(cornerRadius),
        modifier = modifier
            .padding(0.dp, if (isSmallScreen) 30.dp else 50.dp),
        elevation = elevation,
    ) {
        LaunchedEffect(Unit) {
            vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
        }

        Scaffold(
            topBar = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Divider(thickness = dividerThickness)
                }
            },
            content = { paddingValues ->
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .padding(horizontal = if (isSmallScreen) 6.dp else 10.dp)
                        .fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Image(
                        imageVector = Icons.Filled.CheckCircle,
                        modifier = Modifier
                            .size(size = iconSize)
                            .clip(shape = CircleShape)
                            .padding(top = 2.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colors.primary),
                        contentDescription = stringResource(R.string.success),
                    )
                    Spacer(modifier = Modifier.height(spacerHeight))
                    ProductConfirmItem(
                        name = stringResource(R.string.payout),
                        price = completedPayOut.amount,
                        bigStyle = true,
                        isSmallScreen = isSmallScreen
                    )
                    Divider(thickness = dividerThickness)
                    ProductConfirmItem(
                        name = stringResource(R.string.credit_left),
                        price = completedPayOut.newBalance,
                        isSmallScreen = isSmallScreen
                    )

                    // TODO maybe show vouchers here
                }
            },
            bottomBar = {
                Divider(modifier = Modifier.padding(top = if (isSmallScreen) 8.dp else 15.dp))
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(buttonHeight)
                ) {
                    Text(
                        text = stringResource(R.string.done),
                        fontSize = if (isSmallScreen) 16.sp else 18.sp
                    )
                }
            }
        )
    }
}