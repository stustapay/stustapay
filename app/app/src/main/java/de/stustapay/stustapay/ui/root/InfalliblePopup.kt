package de.stustapay.stustapay.ui.root

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.theme.StartpageItemStyle
import de.stustapay.stustapay.R

@Composable
fun InfalliblePopup(
    viewModel: InfalliblePopupViewModel = hiltViewModel()
) {
    val infallibleTooManyFailures by viewModel.infallibleTooManyFailues.collectAsStateWithLifecycle()
    val infallibleRequest_ by viewModel.infallibleRequest.collectAsStateWithLifecycle()
    val infallibleRequest = infallibleRequest_

    val activity = LocalContext.current as Activity

    val resultTopUp by viewModel.resultTopUp.collectAsStateWithLifecycle()
    val resultTicketSale by viewModel.resultTicketSale.collectAsStateWithLifecycle()

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
                    LazyColumn(horizontalAlignment = Alignment.CenterHorizontally) {
                        item {
                            if (infallibleRequest != null) {
                                Text(
                                    stringResource(R.string.infallible_popup_transaction_pending),
                                    fontSize = 25.sp,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.Left
                                )
                                Text(
                                    infallibleRequest.msg(),
                                    fontSize = 25.sp,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.Left
                                )
                            } else {
                                Text(
                                    stringResource(R.string.infallible_popup_but_no_request),
                                    fontSize = 25.sp,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.Left
                                )
                            }
                            
                            // TODO information about the current pending request
                            // and its submission confirmation

                            Spacer(modifier = Modifier.height(20.dp))
                            // queue clearing backdoor button
                            Text(
                                stringResource(R.string.infallible_popup_restart),
                                fontSize = 25.sp,
                                modifier = Modifier
                                    .clickable { viewModel.click() }
                                    .fillMaxWidth(),
                                textAlign = TextAlign.Left,
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
}