package de.stustanet.stustapay.ui.ec

import android.app.Activity
import androidx.compose.material.Button
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

@Composable
fun ECButton(
    ecPayment: (UserTag) -> ECPayment,
    onECResult: (ECState) -> Unit,
    onClickCheck: () -> Job = { Job() },
    modifier: Modifier = Modifier,
    viewModel: ECButtonViewModel = hiltViewModel(),
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current as Activity
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    val ecState: ECState by viewModel.ecState.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()

    LaunchedEffect(ecState) {
        onECResult(ecState)
    }

    NfcScanDialog(
        state = scanState,
        onScan = { tag ->
            scope.launch {
                viewModel.pay(context, ecPayment(tag))
            }
        }
    )

    Button(
        onClick = {
            // only if the pre-check succeeds
//            if (onClickCheck()) {
//                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
//                scanState.open()
//            }
        },
        modifier = modifier,
    ) {
        content()
    }
}