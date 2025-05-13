package de.stustapay.stustapay.ui.payinout.topup

import android.app.Activity
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.pay.CashECCallback
import de.stustapay.stustapay.ui.common.pay.CashECPay
import de.stustapay.stustapay.ui.common.ErrorDialog
import de.stustapay.stustapay.ui.common.pay.NoCashRegisterWarning
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


@Composable
fun TopUpSelection(
    viewModel: TopUpViewModel,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val errorMessage_ by viewModel.errorMessage.collectAsStateWithLifecycle()
    val errorMessage = errorMessage_
    val scope = rememberCoroutineScope()
    val context = LocalContext.current as Activity
    
    // Secret logout gesture detection
    var tapCount by remember { mutableIntStateOf(0) }
    var lastTapTime by remember { mutableLongStateOf(0L) }
    var timeoutJob by remember { mutableStateOf<Job?>(null) }
    val SECRET_TAP_COUNT = 5
    val TAP_TIMEOUT_MS = 1500 // Reset tap count after 1.5 seconds of inactivity
    
    // Function to reset tap count
    val resetTapCount = {
        tapCount = 0
        timeoutJob?.cancel()
        timeoutJob = null
    }

    if (errorMessage != null) {
        ErrorDialog(onDismiss = { scope.launch { viewModel.dismissError() } }) {
            Text(errorMessage, style = MaterialTheme.typography.h4)
        }
    }

    CashECPay(
        modifier = Modifier.fillMaxSize(),
        checkAmount = {
            viewModel.checkAmountLocal(topUpState.currentAmount.toDouble() / 100.0)
        },
        status = { 
            StatusText(
                status = status,
                modifier = Modifier.pointerInput(Unit) {
                    detectTapGestures(
                        onTap = {
                            val currentTime = System.currentTimeMillis()
                            
                            // Cancel existing timeout job
                            timeoutJob?.cancel()
                            
                            // Increment tap count
                            tapCount++
                            
                            // Start new timeout
                            timeoutJob = scope.launch {
                                delay(TAP_TIMEOUT_MS.toLong())
                                tapCount = 0
                            }
                            
                            // Trigger logout if secret tap count reached
                            if (tapCount >= SECRET_TAP_COUNT) {
                                resetTapCount()
                                scope.launch {
                                    try {
                                        // Show logout message as visual feedback
                                        viewModel.showLogoutMessage()
                                        
                                        // Give time for the message to be seen
                                        delay(500)
                                        
                                        // Perform the logout
                                        viewModel.secretLogout()
                                        
                                        // The parent view will handle navigation
                                    } catch (e: Exception) {
                                        // If anything goes wrong, just reset the tap count
                                        resetTapCount()
                                    }
                                }
                            }
                        }
                    )
                }
            ) 
        },
        onPaymentRequested = CashECCallback.Tag(
            onEC = {
                scope.launch {
                    viewModel.topUpWithCard(context, it)
                }
            },
            onCash = {
                scope.launch {
                    viewModel.topUpWithCash(it)
                }
            },
        ),
        ready = topUpConfig.hasConfig() && !requestActive,
        getAmount = { topUpState.currentAmount },
    ) { paddingValues ->
        val scrollState = rememberScrollState()
        Column(modifier = Modifier.verticalScroll(scrollState, reverseScrolling = true)) {
            if (!topUpConfig.canHandleCash() && !topUpConfig.hasOnlyTopUpPrivilege()) {
                NoCashRegisterWarning(modifier = Modifier.padding(4.dp))
            }
            AmountSelection(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp)
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                initialAmount = { topUpState.currentAmount },
                onAmountUpdate = { viewModel.setAmount(it) },
                onClear = { viewModel.clearDraft() },
                config = AmountConfig.Money(
                    limit = (topUpConfig.maxAccountBalance * 100).toUInt(),
                    cents = false,
                )
            )
        }
    }
}