package de.stustapay.stustapay.ui.settings

import android.app.Activity
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.PrefGroup
import kotlinx.coroutines.launch

@Composable
fun ECSettingsView(viewModel: ECSettingsViewModel = hiltViewModel()) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val sumUpState by viewModel.sumUpState.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    val context = LocalContext.current as Activity

    PrefGroup(
        modifier = Modifier.padding(20.dp),
        title = { Text("EC Payment Settings") }
    ) {
        Text(status, fontSize = 24.sp)

        Text(sumUpState.msg(), fontSize = 20.sp)

        Button(
            onClick = { scope.launch { viewModel.openLogin(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Login")
        }

        Button(
            onClick = { scope.launch { viewModel.logout() } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Logout")
        }

        Button(
            onClick = { scope.launch { viewModel.openSettings(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Settings")
        }

        Button(
            onClick = { scope.launch { viewModel.openCardReader(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Card Reader Settings")
        }
    }
}
