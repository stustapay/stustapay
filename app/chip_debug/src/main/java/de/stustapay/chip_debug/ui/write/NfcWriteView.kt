package de.stustapay.chip_debug.ui.write

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.chip_debug.ui.nav.NavScaffold
import de.stustapay.libssp.model.NfcScanFailure

@Composable
fun NfcWriteView(navigateBack: () -> Unit, viewModel: NfcWriteViewModel = hiltViewModel()) {
    val result by viewModel.result.collectAsStateWithLifecycle()
    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    LaunchedEffect(null) {
        viewModel.scan(vibrator)
    }

    NavScaffold(
        title = {
            Text("Write")
        },
        navigateBack = {
            viewModel.stop()
            navigateBack()
        }
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.CenterHorizontally)
                    .padding(20.dp)
            ) {
                Box(Modifier.size(300.dp, 300.dp)) {
                    Card(modifier = Modifier.padding(20.dp)) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Scan a Chip!", textAlign = TextAlign.Center, fontSize = 48.sp)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Divider()
            Spacer(modifier = Modifier.height(16.dp))
            Text(text = "Results", fontSize = 24.sp)

            Column(
                horizontalAlignment = Alignment.Start, modifier = Modifier.fillMaxWidth()
            ) {
                when (val r = result) {
                    is NfcDebugScanResult.None -> Text("No results yet")
                    is NfcDebugScanResult.WriteSuccess -> Text("Written")
                    is NfcDebugScanResult.Failure -> {
                        when (val reason = r.reason) {
                            is NfcScanFailure.NoKey -> Text("no secret key present")
                            is NfcScanFailure.Other -> Text("Failure: ${reason.msg}")
                            is NfcScanFailure.Incompatible -> Text("Tag incompatible")
                            is NfcScanFailure.Lost -> Text("Tag lost")
                            is NfcScanFailure.Auth -> Text("Authentication failed")
                        }
                    }
                }
            }
        }
    }
}
