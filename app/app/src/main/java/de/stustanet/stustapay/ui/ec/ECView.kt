package de.stustanet.stustapay.ui.ec

import android.app.Activity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import java.math.BigDecimal

@Composable
fun ECView(amount : BigDecimal, viewModel: SumUpViewModel = hiltViewModel()){
    var context = LocalContext.current as Activity
    var haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()

    val sumUpUIState : SumUpUIState by viewModel.ecUIState.collectAsStateWithLifecycle()
    Column{
        Button(
            onClick = {
                scope.launch { viewModel.pay(context, BigDecimal(amount.toString())) }
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .padding(10.dp)
        ) {
            Text(text = "EC Pay")
        }
        when (val state = sumUpUIState) {
            is SumUpUIState.Success -> {
                Text(text = "Success: ${state.msg}")
            }
            is SumUpUIState.Error -> {
                Text(text = "Error: ${state.msg}")
            }
            else -> {
                Text(text = "Stuff.")
            }
        }
    }
}