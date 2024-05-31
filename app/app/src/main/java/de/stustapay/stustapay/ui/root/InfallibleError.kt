package de.stustapay.stustapay.ui.root

import android.app.Activity
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
import de.stustapay.stustapay.repository.InfallibleState
import de.stustapay.stustapay.ui.common.ErrorScreen
import de.stustapay.stustapay.ui.common.StatusText

@Composable
fun InfallibleError(
    viewModel: InfallibleErrorViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state) {
        if (state is InfallibleState.CanRetry) {
            viewModel.resetClicker()
        }
    }

    ErrorScreen(onDismiss = null) {
        TerminalConfig()
        InfallibleErrorContent(viewModel = viewModel, state)
    }
}


@Composable
fun InfallibleErrorContent(viewModel: InfallibleErrorViewModel, state: InfallibleState) {
    val activity = LocalContext.current as Activity
    LazyColumn(horizontalAlignment = Alignment.CenterHorizontally) {
        when (state) {
            is InfallibleState.CanRetry, is InfallibleState.Retrying -> {
                val request = when (state) {
                    is InfallibleState.CanRetry -> state.request
                    is InfallibleState.Retrying -> state.request
                    InfallibleState.Hide -> error("unreachable")
                    is InfallibleState.RetrySuccess -> error("unreachable")
                }

                // transaction pending info
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

                    // we have a response of the failure (i.e.
                    if (state is InfallibleState.CanRetry && state.response != null) {
                        val text: String? = when (state.response) {
                            is InfallibleApiResponse.TopUp -> {
                                (state.response.topUp as? Response.Error)?.let {
                                    state.response.topUp.msg()
                                }
                            }

                            is InfallibleApiResponse.TicketSale -> {
                                (state.response.ticketSale as? Response.Error)?.let {
                                    state.response.ticketSale.msg()
                                }
                            }
                        }
                        if (text != null) {
                            StatusText(
                                "status: $text",
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }

                // retry and status button
                item {
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        enabled = state is InfallibleState.CanRetry,
                        onClick = {
                            viewModel.retry()
                        }
                    ) {
                        Text(
                            text = when (state) {
                                is InfallibleState.CanRetry -> "Retry request"
                                is InfallibleState.Retrying -> "Retrying..."
                                InfallibleState.Hide -> "unreachable"
                                is InfallibleState.RetrySuccess -> "unreachable"
                            },
                            style = StartpageItemStyle,
                        )
                    }
                }

                // app restart
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

            // after retry went through successfully
            is InfallibleState.RetrySuccess -> {
                item {
                    when (val resp = state.response) {
                        is InfallibleApiResponse.TopUp -> {
                            Text(
                                when (val topUp = resp.topUp) {
                                    is Response.OK -> {
                                        "TopUp of %.2f successful!".format(topUp.data.amount)
                                    }

                                    is Response.Error.Service.AlreadyProcessed -> {
                                        "TopUp successful! (was already booked: %s)".format(
                                            topUp.msg()
                                        )
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
                                        "Ticket sale successful! (was already booked: %s)".format(
                                            ticketSale.msg()
                                        )
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

            is InfallibleState.Hide -> {
                item {
                    // hide is default in viewmodel :)
                    Text("popup initializing...")
                }
            }
        }
    }
}