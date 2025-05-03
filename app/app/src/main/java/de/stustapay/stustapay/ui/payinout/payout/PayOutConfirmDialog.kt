package de.stustapay.stustapay.ui.payinout.payout


import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.stustapay.R
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.stustapay.ui.common.pay.CashConfirmView
import de.stustapay.stustapay.ui.common.pay.CashECCallback
import de.stustapay.stustapay.ui.device.DeviceConfigProvider
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

@Preview
@Composable
fun PreviewCashOutConfirmDialog() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CashOutConfirmCard(
            onConfirm = {},
            onAbort = {},
            getAmount = { 4212u },
        )
    }
}

@Composable
fun PayOutConfirmDialog(
    state: DialogDisplayState,
    onConfirm: () -> Unit = {},
    onAbort: () -> Unit = {},
    getAmount: () -> UInt,
    status: @Composable () -> Unit = {},
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
    
    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            },
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true,
                usePlatformDefaultWidth = false
            )
        ) {
            // Use full screen width with proper centering for small screens
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CashOutConfirmCard(
                    modifier = Modifier.let {
                        // Apply scaling for small screens
                        if (deviceConfig.isSmallScreen) {
                            it.fillMaxWidth(0.85f)  // Use 85% of screen width
                        } else {
                            it.fillMaxWidth(0.95f)  // Use 95% of screen width for normal screens
                        }
                    },
                    onConfirm = onConfirm,
                    onAbort = onAbort,
                    status = status,
                    getAmount = getAmount,
                    isSmallScreen = deviceConfig.isSmallScreen
                )
            }
        }
    }
}


@Composable
fun CashOutConfirmCard(
    modifier: Modifier = Modifier.fillMaxWidth(),
    onConfirm: () -> Unit,
    onAbort: () -> Unit,
    getAmount: () -> UInt,
    status: @Composable () -> Unit = {},
    isSmallScreen: Boolean = false
) {
    val cornerRadius = if (isSmallScreen) 8.dp else 10.dp
    val elevation = if (isSmallScreen) 4.dp else 8.dp
    val contentPadding = if (isSmallScreen) 6.dp else 10.dp
    
    Card(
        shape = RoundedCornerShape(cornerRadius),
        modifier = modifier
            .padding(horizontal = 0.dp, vertical = if (isSmallScreen) 5.dp else 10.dp),
        elevation = elevation,
    ) {
        Box(
            modifier = Modifier
                .padding(contentPadding)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            CashConfirmView(
                status = status,
                getAmount = getAmount,
                question = stringResource(R.string.payed_to_user_q),
                goBack = onAbort,
                onPay = CashECCallback.NoTag(onCash = onConfirm),
                isSmallScreen = isSmallScreen
            )
        }
    }
}