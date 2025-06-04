package de.stustapay.stustapay.ui.payinout.topup

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Euro
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
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
fun TopUpProgressIndicator(
    currentStep: Int,
    modifier: Modifier = Modifier
) {
    val steps = listOf(
        Triple(Icons.Filled.Euro, stringResource(R.string.topup_step_amount), 1),
        Triple(Icons.Filled.NearMe, stringResource(R.string.topup_step_scan), 2),
        Triple(Icons.Filled.CreditCard, stringResource(R.string.topup_step_payment), 3)
    )
    
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = 4.dp,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            steps.forEachIndexed { index, (icon, label, stepNumber) ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(
                                if (stepNumber <= currentStep) {
                                    MaterialTheme.colors.primary
                                } else {
                                    MaterialTheme.colors.onSurface.copy(alpha = 0.2f)
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = label,
                            tint = if (stepNumber <= currentStep) {
                                MaterialTheme.colors.onPrimary
                            } else {
                                MaterialTheme.colors.onSurface.copy(alpha = 0.4f)
                            },
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = label,
                        style = MaterialTheme.typography.caption,
                        textAlign = TextAlign.Center,
                        fontWeight = if (stepNumber == currentStep) FontWeight.Bold else FontWeight.Normal,
                        color = if (stepNumber <= currentStep) {
                            MaterialTheme.colors.primary
                        } else {
                            MaterialTheme.colors.onSurface.copy(alpha = 0.6f)
                        }
                    )
                }
                
                // Add connector line between steps (except after last step)
                if (index < steps.size - 1) {
                    Box(
                        modifier = Modifier
                            .height(2.dp)
                            .weight(0.5f)
                            .background(
                                if (stepNumber < currentStep) {
                                    MaterialTheme.colors.primary
                                } else {
                                    MaterialTheme.colors.onSurface.copy(alpha = 0.2f)
                                }
                            )
                            .align(Alignment.CenterVertically)
                    )
                }
            }
        }
    }
}


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
    
    // Determine current step based on app state
    val currentStep = when {
        topUpState.currentAmount == 0u -> 1 // Still entering amount
        status.contains("scan", ignoreCase = true) || status.contains("chip", ignoreCase = true) -> 2 // Scanning
        status.contains("payment", ignoreCase = true) || status.contains("sumup", ignoreCase = true) -> 3 // Payment
        else -> 1 // Amount entered but not yet scanning
    }
    
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

    // Enhanced CashECPay with better button text for topup users
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
        ready = topUpConfig.hasConfig() && !requestActive && topUpState.currentAmount > 0u,
        getAmount = { topUpState.currentAmount },
    ) { paddingValues ->
        val scrollState = rememberScrollState()
        Column(modifier = Modifier.verticalScroll(scrollState, reverseScrolling = true)) {
            // Show progress indicator for self-service users
            if (topUpConfig.hasOnlyTopUpPrivilege()) {
                TopUpProgressIndicator(
                    currentStep = currentStep,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Add helpful instruction text
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp),
                    elevation = 2.dp,
                    backgroundColor = MaterialTheme.colors.primary.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = when (currentStep) {
                            1 -> if (topUpState.currentAmount == 0u) {
                                stringResource(R.string.topup_enter_amount)
                            } else {
                                stringResource(R.string.topup_press_scan_pay)
                            }
                            2 -> stringResource(R.string.topup_scan_instruction)
                            3 -> stringResource(R.string.topup_payment_instruction)
                            else -> ""
                        },
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.body1,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colors.primary
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
            }
            
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