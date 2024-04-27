package de.stustapay.stustapay.ui.root

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.theme.StartpageItemStyle
import de.stustapay.stustapay.R
import kotlinx.coroutines.coroutineScope

@Composable
fun InfalliblePopup(
    viewModel: InfalliblePopupViewModel = hiltViewModel()
) {
    val infallibleTooManyFailures by viewModel.infallibleTooManyFailues.collectAsStateWithLifecycle()
    val infallibleRequest by viewModel.infallibleRequest.collectAsStateWithLifecycle()
    val activity = LocalContext.current as Activity

    LaunchedEffect(infallibleTooManyFailures) {
        viewModel.reset()
    }

    if (infallibleTooManyFailures) {
        Dialog(onDismissRequest = {}) {
            Card(
                shape = RoundedCornerShape(10.dp),
                elevation = 8.dp,
            ) {
                Box(
                    modifier = Modifier
                        .padding(20.dp)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "A background task is still running: " + (infallibleRequest?.msg()
                                ?: "None") + ". Try restarting the app.",
                            fontSize = 20.sp,
                            modifier = Modifier.clickable {
                                viewModel.click()
                            }
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(onClick = {
                            val packageManager: PackageManager = activity.packageManager
                            val intent: Intent =
                                packageManager.getLaunchIntentForPackage(activity.packageName)!!
                            val componentName: ComponentName = intent.component!!
                            val restartIntent: Intent =
                                Intent.makeRestartActivityTask(componentName)
                            activity.startActivity(restartIntent)
                            Runtime.getRuntime().exit(0)
                        }) {
                            Text(
                                text = stringResource(id = R.string.root_item_restart_app),
                                style = StartpageItemStyle,
                            )
                        }
                    }
                }
            }
        }
    }
}