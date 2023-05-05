package de.stustanet.stustapay.ui.common.pay


import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon
import de.stustanet.stustapay.ui.nav.navigateTo


/**
 * if we want to pay something either by cash or by credit card.
 */
@Composable
fun CashECPay(
    leaveView: () -> Unit = {},
    onEC: (UserTag) -> Unit,
    onCash: (UserTag) -> Unit,
    checkAmount: () -> Boolean = { true },
    ready: Boolean,
    getAmount: () -> Double,
    status: String,
    title: String = "",
    content: @Composable (PaddingValues) -> Unit,
) {
    val nav = rememberNavController()

    NavHost(
        navController = nav,
        startDestination = "select"
    ) {
        composable("select") {
            CashECSelection(
                goToCash = {
                    if (checkAmount()) {
                        nav.navigateTo("cash_confirm")
                    }
                },
                leaveView = leaveView,
                onEC = onEC,
                ready = ready,
                status = status,
                title = title,
                checkAmount = checkAmount,
                content = content,
            )
        }
        composable("cash_confirm") {
            CashConfirmView(
                goBack = { nav.navigateTo("select") },
                getAmount = getAmount,
                status = status,
                onConfirm = onCash,
            )
        }
    }
}

@Composable
fun CashECSelection(
    goToCash: () -> Unit,
    leaveView: () -> Unit = {},
    onEC: (UserTag) -> Unit,
    ready: Boolean,
    status: String,
    title: String = "",
    checkAmount: () -> Boolean,
    content: @Composable (PaddingValues) -> Unit
) {
    val haptic = LocalHapticFeedback.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                    leaveView()
                },
            )
        },
        content = content,
        bottomBar = {
            Column(modifier = Modifier.padding(20.dp)) {
                Divider(modifier = Modifier.fillMaxWidth())
                Text(status, fontSize = 32.sp)

                Row(modifier = Modifier.padding(top = 10.dp)) {
                    // Cash flow
                    Button(
                        modifier = Modifier
                            .fillMaxWidth(0.5f)
                            .padding(end = 10.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            goToCash()
                        },
                        enabled = ready,
                    ) {
                        // unicode "Coin"
                        Text(
                            "\uD83E\uDE99 cash", fontSize = 48.sp,
                            textAlign = TextAlign.Center,
                        )
                    }

                    // EC Flow
                    val scanState = rememberNfcScanDialogState()
                    NfcScanDialog(
                        state = scanState,
                        onScan = { tag ->
                            onEC(tag)
                        }
                    )

                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 10.dp),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            if (checkAmount()) {
                                scanState.open()
                            }
                        },
                        enabled = ready,
                    ) {
                        // unicode "Credit Card"
                        Text(
                            "\uD83D\uDCB3 card", fontSize = 48.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    )
}
