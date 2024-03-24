package de.stustapay.stustapay.repository

import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiRequestKind
import de.stustapay.stustapay.storage.InfallibleApiRequestLocalDataSource
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
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

    fun launch() {
        runner = scope.launch {
            dataSource.requests.collect {
                var requests = it

                var retry = true
                var attempts = 3
                while (retry && attempts > 0) {
                    retry = false

                    for ((id, request) in it) {
                        when (process(request)) {
                            InfallibleResult.Ok -> {
                                dataSource.remove(id)
                                requests = requests.filter { it.key != id }
                            }

                            InfallibleResult.Retry -> retry = true
                        }
                    }

                    attempts -= 1
                    delay(1000)
                }
            }
        }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp) {
        dataSource.push(
            newTopUp.uuid, InfallibleApiRequest(InfallibleApiRequestKind.TopUp(newTopUp))
        )
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale) {
        dataSource.push(
            newTicketSale.uuid,
            InfallibleApiRequest(InfallibleApiRequestKind.TicketSale(newTicketSale))
        )
    }

    private suspend fun process(request: InfallibleApiRequest): InfallibleResult {
        val kind = request.kind
        return when (kind) {
            is InfallibleApiRequestKind.TopUp -> {
                when (topUpRepository.bookTopUp(kind.content)) {
                    is Response.OK -> InfallibleResult.Ok
                    is Response.Error.Access -> InfallibleResult.Retry
                    is Response.Error.NotFound -> InfallibleResult.Retry
                    is Response.Error.Request -> InfallibleResult.Retry
                    is Response.Error.Server -> InfallibleResult.Retry
                    is Response.Error.Service.Generic -> InfallibleResult.Retry
                    is Response.Error.Service.NotEnoughFunds -> InfallibleResult.Retry
                }
            }

            is InfallibleApiRequestKind.TicketSale -> {
                when (ticketRepository.bookTicketSale(kind.content)) {
                    is Response.OK -> InfallibleResult.Ok
                    is Response.Error.Access -> InfallibleResult.Retry
                    is Response.Error.NotFound -> InfallibleResult.Retry
                    is Response.Error.Request -> InfallibleResult.Retry
                    is Response.Error.Server -> InfallibleResult.Retry
                    is Response.Error.Service.Generic -> InfallibleResult.Retry
                    is Response.Error.Service.NotEnoughFunds -> InfallibleResult.Retry
                }
            }
        }
    }
}

enum class InfallibleResult {
    Ok, Retry
}