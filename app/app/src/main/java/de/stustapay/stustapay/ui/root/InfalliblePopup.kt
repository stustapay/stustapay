package de.stustapay.stustapay.ui.root

import android.app.Activity
import android.util.Log
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.ui.theme.StartpageItemStyle
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiResponse

@Composable
fun InfalliblePopup(
    viewModel: InfalliblePopupViewModel = hiltViewModel()
) {
    val state_ by viewModel.state.collectAsStateWithLifecycle()
    val state = state_

    val activity = LocalContext.current as Activity

    LaunchedEffect(state) {
        if (state is PopupState.CanRetry) {
            viewModel.resetClicker()
        }
    }

    if (state != PopupState.Hide) {
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

                        when (state) {
                            is PopupState.CanRetry, is PopupState.Retrying -> {
                                val request = when (state) {
                                    is PopupState.CanRetry -> state.request
                                    is PopupState.Retrying -> state.request
                                    else -> error("unreachable")
                                }
                                item {
                                    Text(
                                        stringResource(R.string.infallible_popup_transaction_pending),
                                        fontSize = 25.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.fillMaxWidth(),
                                        textAlign = TextAlign.Left
                                    )

                                    // TODO :) nicer ui
                                    when (request) {
                                        is InfallibleApiRequest.TopUp -> {
                                            Text(
                                                request.msg(),
                                                fontSize = 25.sp,
                                                modifier = Modifier.fillMaxWidth(),
                                                textAlign = TextAlign.Left
                                            )
                                        }

                                        is InfallibleApiRequest.TicketSale -> {
                                            Text(
                                                request.msg(),
                                                fontSize = 25.sp,
                                                modifier = Modifier.fillMaxWidth(),
                                                textAlign = TextAlign.Left
                                            )
                                        }
                                    }
                                }

                                item {
                                    Spacer(modifier = Modifier.height(20.dp))
                                    Button(
                                        enabled = true,
                                        onClick = {
                                            viewModel.retry()
                                        }
                                    ) {
                                        Text(
                                            text = when (state) {
                                                is PopupState.CanRetry -> "Retry request"
                                                is PopupState.Retrying -> "Retrying..."
                                                else -> error("unreachable")
                                            },
                                            style = StartpageItemStyle,
                                        )
                                    }
                                }

                                item {
                                    Spacer(modifier = Modifier.height(20.dp))
                                    // queue clearing backdoor button
                                    Text(
                                        stringResource(R.string.infallible_popup_restart),
                                        fontSize = 25.sp,
                                        modifier = Modifier
                                            .clickable { viewModel.bypass() }
                                            .fillMaxWidth(),
                                        textAlign = TextAlign.Left,
                                    )
                                    Spacer(modifier = Modifier.height(20.dp))
                                    Button(onClick = {
                                        restartApp(activity)
                                    }) {
                                        Text(
                                            text = stringResource(id = R.string.root_item_restart_app),
                                            style = StartpageItemStyle,
                                        )
                                    }
                                }
                            }

                            is PopupState.RetrySuccess -> {
                                item {
                                    when (val resp = state.response) {
                                        is InfallibleApiResponse.TopUp -> {
                                            Text(
                                                when (val topUp = resp.topUp) {
                                                    is Response.OK -> {
                                                        "TopUp of %.2f successful!".format(topUp.data.amount)
                                                    }

                                                    is Response.Error.Service.AlreadyProcessed -> {
                                                        "TopUp successful! (was already booked: %s)".format(topUp.msg())
                                                    }

                                                    is Response.Error -> {
                                                        "Contact Finanzteam! TopUp aborted: %s".format(
                                                            topUp.msg()
                                                        )
                                                    }
                                                },
                                                fontSize = 25.sp,
                                                modifier = Modifier.fillMaxWidth(),
                                                textAlign = TextAlign.Left
                                            )
                                        }

                                        is InfallibleApiResponse.TicketSale -> {
                                            Text(
                                                when (val ticketSale = resp.ticketSale) {
                                                    is Response.OK -> {
                                                        "Ticket sale successful!"
                                                    }

                                                    is Response.Error.Service.AlreadyProcessed -> {
                                                        "Ticket sale successful! (was already booked: %s)".format(ticketSale.msg())
                                                    }

                                                    is Response.Error -> {
                                                        "Contact Finanzteam! Ticket sale aborted: %s".format(
                                                            ticketSale.msg()
                                                        )
                                                    }
                                                },
                                                fontSize = 25.sp,
                                                modifier = Modifier.fillMaxWidth(),
                                                textAlign = TextAlign.Left
                                            )
                                        }
                                    }
                                }

                                item {
                                    Spacer(modifier = Modifier.height(40.dp))
                                    Button(onClick = {
                                        viewModel.dismiss()
                                    }) {
                                        Text(
                                            // SPARKLING HEART
                                            text = "Continue \uD83D\uDC96",
                                            style = StartpageItemStyle,
                                        )
                                    }
                                }
                            }

                            is PopupState.Hide -> {
                                error("popup is show even though it should be hidden")
                            }
                        }
                    }
                }
            }
        }
    }
}