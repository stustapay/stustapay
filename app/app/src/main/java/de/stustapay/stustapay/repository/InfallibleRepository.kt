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
import de.stustapay.stustapay.netsource.TicketRemoteDataSource
import de.stustapay.stustapay.netsource.TopUpRemoteDataSource
import de.stustapay.stustapay.storage.InfallibleApiRequestLocalDataSource
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton


sealed interface InfallibleState {
    /** no overlay visible */
    object Hide : InfallibleState

    /** show request attempt that can be retried */
    data class CanRetry(val request: InfallibleApiRequest, val response: InfallibleApiResponse?) :
        InfallibleState

    /** when the request is currently retrying */
    data class Retrying(val request: InfallibleApiRequest) : InfallibleState

    /** show request result that must be dismissed */
    data class RetrySuccess(val response: InfallibleApiResponse) : InfallibleState
}

@Singleton
class InfallibleRepository @Inject constructor(
    private val dataSource: InfallibleApiRequestLocalDataSource,
    private val topUpApi: TopUpRemoteDataSource,
    private val ticketApi: TicketRemoteDataSource
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

    private val informUser = MutableStateFlow(false)

    val state: Flow<InfallibleState> =
        combine(
            request,
            response,
            active
        ) { request, response, active ->
            if (request == null) {
                // request was sent or manually cleared -> it's null
                if (response != null && informUser.value) {
                    InfallibleState.RetrySuccess(response)
                } else {
                    InfallibleState.Hide
                }
            } else {
                // request is pending.
                when (request.status()) {
                    is InfallibleApiRequest.Status.Failed -> {
                        // when a request failed initially
                        informUser.update { true }
                        InfallibleState.CanRetry(request, response)
                    }

                    is InfallibleApiRequest.Status.Normal -> {
                        if (informUser.value && active) {
                            // when we retried through the popup
                            InfallibleState.Retrying(request)
                        } else {
                            // for every normal request
                            InfallibleState.Hide
                        }
                    }
                }
            }
        }

    private suspend fun updateRequest(req: InfallibleApiRequest) {
        dataSource.update(req)
    }

    private suspend fun clearRequest() {
        dataSource.clear()
    }

    fun launch() {
        runner = scope.launch {

            Log.i("infallible", "launching request collector")
            // pending requests are tried to be sent here
            request.collect { request ->
                Log.i("infallible", "collecting persistent db request: ${request}")

                if (request == null) {
                    return@collect
                }

                Log.i("infallible", "persistent db request has status: ${request.status()}")

                // don't retry sending failed requests (unless manually requested)
                if (request.status() is InfallibleApiRequest.Status.Failed) {
                    return@collect
                }

                _active.update { true }

                _response.update { null }

                var response: InfallibleApiResponse? = null
                var success = false

                // we do the retries in the lower http layer now for every request!
                val maxAttempts = 1
                for (attempt in 1..maxAttempts) {
                    Log.i("infallible", "attempt ${attempt} to send")
                    response = when (request) {
                        is InfallibleApiRequest.TopUp -> {
                            val repoResponse = topUpApi.bookTopUp(request.topUp)
                            success = repoResponse.submitSuccess()
                            InfallibleApiResponse.TopUp(repoResponse)
                        }

                        is InfallibleApiRequest.TicketSale -> {
                            val repoResponse = ticketApi.bookTicketSale(request.ticketSale)
                            success = repoResponse.submitSuccess()
                            InfallibleApiResponse.TicketSale(repoResponse)
                        }
                    }

                    if (success) {
                        break
                    }

                    // retry delay
                    Log.i("infallible", "fail to send - waiting 1s")
                    delay(1000)
                    Log.i("infallible", "done waiting")
                }

                if (success) {
                    Log.i("infallible", "success - clearing")
                    // remove successful pending request
                    clearRequest()
                } else {
                    Log.i("infallible", "fail - marking as failed")
                    // store that it has failed
                    updateRequest(request.asFailed())
                }

                // response can be ok or error!
                _response.update { response!! }
                _active.update { false }
            }
        }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        Log.i(
            "infallible entry",
            "booking top up, setting response=null, current response=${_response.value}"
        )
        _response.update { null }
        Log.i("infallible entry", "persisting to database")
        updateRequest(
            InfallibleApiRequest.TopUp(newTopUp)
        )
        Log.i("infallible entry", "waiting for response")
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
        informUser.update { false }
    }

    suspend fun clear() {
        // forget the request
        clearRequest()
        // this will allow the next booking
        _response.update { null }
    }

    suspend fun retry() {
        informUser.update { true }
        val req = request.value
        if (req != null) {
            updateRequest(req.asNormal())
        }
    }
}
