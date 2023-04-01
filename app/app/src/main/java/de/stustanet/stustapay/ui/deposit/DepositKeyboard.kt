package de.stustanet.stustapay.ui.deposit

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun DepositKeyboard(onDigit: (UInt) -> Unit, onClear: () -> Unit) {
    val haptic = LocalHapticFeedback.current

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(1u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("1", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(2u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("2", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(3u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("3", fontSize = 24.sp)
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(4u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("4", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(5u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("5", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(6u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("6", fontSize = 24.sp)
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(7u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("7", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(8u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("8", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(9u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("9", fontSize = 24.sp)
            }
        }
        Row (
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.33f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(0u)
                    onDigit(0u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("00", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onDigit(0u)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("0", fontSize = 24.sp)
            }
            Button(
                modifier = Modifier
                    .fillMaxWidth(1f)
                    .height(90.dp)
                    .padding(5.dp),
                onClick = {
                    onClear()
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            ) {
                Text("❌", fontSize = 24.sp)
            }
        }
    }
}