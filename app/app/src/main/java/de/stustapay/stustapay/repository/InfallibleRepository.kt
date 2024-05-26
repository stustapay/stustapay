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
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
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

    val request = dataSource.request

    // not null when we have a response from successful submission
    private val _response = MutableStateFlow<InfallibleApiResponse?>(null)
    val response = _response.asStateFlow()

    fun launch() {
        runner = scope.launch {

            // pending requests are tried to be sent here
            dataSource.request.collect { request ->
                if (request == null) {
                    return@collect
                }

                Log.i("InfallibleRequest", "handling pending request ${request.msg()}")

                // don't retry sending failed requests (unless manually requested)
                if (request.status is InfallibleApiRequest.Status.Failed) {
                    return@collect
                }

                Log.i("InfallibleRequest", "trying to send request...")

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

                if (success) {
                    // remove successful pending request
                    dataSource.clear()
                    _response.update { response!! }
                } else {
                    // let it show up as warning
                    request.markFailed()
                    dataSource.update(
                        request
                    )
                }
            }
        }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        // make sure no other request is running
        _response.waitFor { it == null }

        dataSource.update(
            InfallibleApiRequest.TopUp(newTopUp)
        )

        val ret = _response.waitFor { it != null }!!
        return (ret as InfallibleApiResponse.TopUp).topUp
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        // make sure no other request is running
        _response.waitFor { it == null }

        dataSource.update(
            InfallibleApiRequest.TicketSale(newTicketSale)
        )

        val ret = _response.waitFor { it != null }!!
        return (ret as InfallibleApiResponse.TicketSale).ticketSale
    }

    suspend fun clear() {
        // forget the request
        dataSource.clear()
    }

    suspend fun retry() {
        val req = dataSource.request.first()
        if (req != null) {
            req.markNormal()
            dataSource.update(
                req
            )
        }
    }
}
