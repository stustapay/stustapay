package de.stustapay.stustapay.ui.root

import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.restartApp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiResponse
import de.stustapay.stustapay.repository.InfallibleState
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorBackground
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import androidx.compose.material.Text

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

    OperatorBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            OperatorPanel(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 760.dp)
            ) {
                InfallibleErrorContent(
                    viewModel = viewModel,
                    state = state,
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                )
            }
        }
    }
}

@Composable
fun InfallibleErrorContent(
    viewModel: InfallibleErrorViewModel,
    state: InfallibleState,
    modifier: Modifier = Modifier,
) {
    val activity = LocalActivity.current!!

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        when (state) {
            is InfallibleState.CanRetry,
            is InfallibleState.Retrying -> {
                val request = when (state) {
                    is InfallibleState.CanRetry -> state.request
                    is InfallibleState.Retrying -> state.request
                    InfallibleState.Hide -> error("unreachable")
                    is InfallibleState.RetrySuccess -> error("unreachable")
                }

                val retryStatus = if (state is InfallibleState.CanRetry) {
                    infallibleFailedStatusMessage(state.response)
                } else {
                    null
                }

                OperatorStatePanel(
                    title = stringResource(R.string.infallible_popup_transaction_pending),
                    message = request.msg(),
                    success = false,
                )

                if (!retryStatus.isNullOrBlank()) {
                    Text(
                        text = stringResource(R.string.infallible_status_format, retryStatus),
                        color = OperatorPalette.subtitle,
                        fontSize = 16.sp,
                        lineHeight = 22.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }

                OperatorActionButton(
                    text = when (state) {
                        is InfallibleState.CanRetry -> stringResource(R.string.infallible_retry_send)
                        is InfallibleState.Retrying -> stringResource(R.string.infallible_retry_sending)
                        InfallibleState.Hide -> error("unreachable")
                        is InfallibleState.RetrySuccess -> error("unreachable")
                    },
                    enabled = state is InfallibleState.CanRetry,
                    onClick = { viewModel.retry() },
                )

                OperatorActionButton(
                    text = stringResource(id = R.string.root_item_restart_app),
                    destructive = true,
                    onClick = { restartApp(activity) },
                )

                Text(
                    text = stringResource(R.string.infallible_popup_restart),
                    color = OperatorPalette.subtitle,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { viewModel.bypass() },
                )
            }

            is InfallibleState.RetrySuccess -> {
                OperatorStatePanel(
                    title = stringResource(R.string.common_status_done),
                    message = infallibleSuccessMessage(state.response),
                    success = true,
                )

                OperatorActionButton(
                    text = stringResource(R.string.continue_label),
                    onClick = { viewModel.dismiss() },
                )
            }

            is InfallibleState.Hide -> {
                Text(
                    text = stringResource(R.string.infallible_popup_initializing),
                    color = OperatorPalette.subtitle,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

private fun infallibleFailedStatusMessage(response: InfallibleApiResponse?): String? {
    response ?: return null

    return when (response) {
        is InfallibleApiResponse.TopUp -> {
            (response.topUp as? Response.Error)?.let { response.topUp.msg() }
        }

        is InfallibleApiResponse.TicketSale -> {
            (response.ticketSale as? Response.Error)?.let { response.ticketSale.msg() }
        }

        is InfallibleApiResponse.Sale -> {
            (response.sale as? Response.Error)?.let { response.sale.msg() }
        }
    }
}

private fun infallibleSuccessMessage(response: InfallibleApiResponse): String {
    return when (response) {
        is InfallibleApiResponse.TopUp -> {
            when (val topUp = response.topUp) {
                is Response.OK -> {
                    "Aufladung über %.2f erfolgreich!".format(topUp.data.amount)
                }

                is Response.Error.Service.AlreadyProcessed -> {
                    "Aufladung erfolgreich! (war bereits gebucht: %s)".format(topUp.msg())
                }

                is Response.Error -> {
                    "Finanzteam kontaktieren! Aufladung abgebrochen: %s".format(topUp.msg())
                }
            }
        }

        is InfallibleApiResponse.TicketSale -> {
            when (val ticketSale = response.ticketSale) {
                is Response.OK -> {
                    "Ticketverkauf erfolgreich!"
                }

                is Response.Error.Service.AlreadyProcessed -> {
                    "Ticketverkauf erfolgreich! (war bereits gebucht: %s)".format(ticketSale.msg())
                }

                is Response.Error -> {
                    "Finanzteam kontaktieren! Ticketverkauf abgebrochen: %s".format(ticketSale.msg())
                }
            }
        }

        is InfallibleApiResponse.Sale -> {
            when (val sale = response.sale) {
                is Response.OK -> {
                    "Verkauf erfolgreich!"
                }

                is Response.Error.Service.AlreadyProcessed -> {
                    "Verkauf erfolgreich! (war bereits gebucht: %s)".format(sale.msg())
                }

                is Response.Error -> {
                    "Finanzteam kontaktieren! Verkauf abgebrochen: %s".format(sale.msg())
                }
            }
        }
    }
}
