package de.stustanet.stustapay.ui.debug

import android.app.Activity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Preview
@Composable
fun ECDebugView(viewModel: ECDebugViewModel = hiltViewModel()) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val sumUpState by viewModel.sumUpState.collectAsStateWithLifecycle()

    val scrollState = rememberScrollState()

    var context = LocalContext.current as Activity


    Column(
        modifier = Modifier
            .padding(16.dp)
            .fillMaxSize()
            .verticalScroll(state = scrollState)
    ) {
        Text(status, fontSize = 24.sp)

        Text(sumUpState.msg(), fontSize = 20.sp)

        Button(
            onClick = { viewModel.openLogin(context) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Login")
        }

        Button(
            onClick = { viewModel.openSettings(context) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Settings")
        }

        Button(
            onClick = { viewModel.openCheckout(context) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("SumUp Test Checkout")
        }
    }
}
