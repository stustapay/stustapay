package de.stustanet.stustapay.ui.ec

import android.app.Activity
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import java.math.BigDecimal

@Composable
fun ECView(amount : BigDecimal, sumUpViewModel: SumUpViewModel = hiltViewModel()){
    var context = LocalContext.current as Activity
    var haptic = LocalHapticFeedback.current
    Button(
        onClick = {
            sumUpViewModel.pay(context, BigDecimal(amount.toString()))
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(70.dp)
            .padding(10.dp)
    ) {
        Text(text = "EC Pay")
    }
}