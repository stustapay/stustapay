package de.stustapay.stustapay.ui.settings

import android.app.Activity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
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
    val sumUpLoginState by viewModel.sumUpLogin.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    val context = LocalActivity.current!!

    PrefGroup(
        modifier = Modifier.padding(20.dp),
        title = { Text("EC Payment Settings") }
    ) {

        Text(sumUpLoginState ?: "No login info", fontSize = 20.sp)

        Text(status, fontSize = 24.sp)

        Text(sumUpState.msg(), fontSize = 20.sp)

        Button(
            onClick = { scope.launch { viewModel.openLogin(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp User/Password Login")
        }

        Button(
            onClick = { scope.launch { viewModel.performTokenLogin(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Login with Token")
        }

        Divider(thickness = 2.dp, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp))

        Button(
            onClick = { scope.launch { viewModel.logout() } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Logout")
        }

        Divider(thickness = 2.dp, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp))

        Button(
            onClick = { scope.launch { viewModel.openCardReader(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Card Reader Settings")
        }

        Divider(thickness = 2.dp, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp))

        Button(
            onClick = { scope.launch { viewModel.openOldSettings(context) } },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Deprecated SumUp Settings")
        }
    }
}
