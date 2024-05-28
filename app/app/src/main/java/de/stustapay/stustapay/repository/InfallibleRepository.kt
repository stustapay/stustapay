package de.stustapay.stustapay.repository

import android.util.Log
import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.waitFor
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiResponse
import de.stustapay.stustapay.storage.InfallibleApiRequestLocalDataSource
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton


@Singleton
class InfallibleRepository @Inject constructor(
    private val dataSource: InfallibleApiRequestLocalDataSource,
    private val topUpRepository: TopUpRepository,
    private val ticketRepository: TicketRepository
) {
    private val scope: CoroutineScope =
        CoroutineScope(Dispatchers.Default + CoroutineName("infallible"))
    private lateinit var runner: Job

    val request = dataSource.request.stateIn(
        scope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = null,
    )

    // not null when we have a response from successful submission
    private val _response = MutableStateFlow<InfallibleApiResponse?>(null)
    val response = _response.asStateFlow()

    private val _active = MutableStateFlow(false)
    val active = _active.asStateFlow()

    private suspend fun updateRequest(req: InfallibleApiRequest) {
        dataSource.update(req)
    }

    private suspend fun clearRequest() {
        dataSource.clear()
    }

    fun launch() {
        runner = scope.launch {

            // pending requests are tried to be sent here
            request.collect { request ->

                if (request == null) {
                    return@collect
                }

                // don't retry sending failed requests (unless manually requested)
                if (request.status() is InfallibleApiRequest.Status.Failed) {
                    return@collect
                }

                _active.update { true }

                _response.update { null }

                var response: InfallibleApiResponse? = null
                var success = false

                val maxAttempts = 3
                for (attempt in 1..maxAttempts) {
                    response = when (request) {
                        is InfallibleApiRequest.TopUp -> {
                            val repoResponse = topUpRepository.bookTopUp(request.topUp)
                            success = repoResponse.submitSuccess()
                            InfallibleApiResponse.TopUp(repoResponse)
                        }

                        is InfallibleApiRequest.TicketSale -> {
                            val repoResponse = ticketRepository.bookTicketSale(request.ticketSale)
                            success = repoResponse.submitSuccess()
                            InfallibleApiResponse.TicketSale(repoResponse)
                        }
                    }

                    if (success) {
                        break
                    }

                    // retry delay
                    delay(1000)
                }

                _active.update { false }

                if (success) {
                    // remove successful pending request
                    clearRequest()
                } else {
                    // store that it has failed
                    updateRequest(request.asFailed())
                }
                // response can be ok or error!
                _response.update { response!! }
            }
        }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        _response.update { null }
        updateRequest(
            InfallibleApiRequest.TopUp(newTopUp)
        )

        // wait for the result delivery
        val response = _response.waitFor { it != null }!!
        val ret = (response as InfallibleApiResponse.TopUp).topUp

        // we forget the response here so we can accept new requests
        _response.update { null }
        return ret
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        _response.update { null }
        updateRequest(
            InfallibleApiRequest.TicketSale(newTicketSale)
        )

        // wait for the result delivery
        val response = _response.waitFor { it != null }!!
        val ret = (response as InfallibleApiResponse.TicketSale).ticketSale

        // allow the next booking
        _response.update { null }
        return ret
    }

    /** when the request was delivered, and its result dismissed */
    suspend fun dismissSuccess() {
        _response.update { null }
    }

    suspend fun clear() {
        // forget the request
        clearRequest()
        // this will allow the next booking
        _response.update { null }
    }

    suspend fun retry() {
        val req = request.value
        if (req != null) {
            updateRequest(req.asNormal())
        }
    }
}
