package de.stustapay.stustapay.repository

import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.waitFor
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiRequestKind
import de.stustapay.stustapay.storage.InfallibleApiRequestLocalDataSource
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.UUID
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

    val busy: Flow<Boolean> = dataSource.requests.map { it.isNotEmpty() }
    val currentRequest: Flow<InfallibleApiRequest?> = dataSource.requests.map { it.values.firstOrNull() }

    private val _tooManyFailures = MutableStateFlow(false)
    val tooManyFailures: Flow<Boolean> = _tooManyFailures

    fun launch() {
        runner = scope.launch {
            dataSource.requests.collect {
                _tooManyFailures.update { false }

                var requests = it

                var retry = true
                var retries = 0
                while (retry) {
                    retry = false

                    for ((id, request) in it) {
                        when (process(request)) {
                            InfallibleResult.Ok -> {
                                dataSource.remove(id)
                                requests = requests.filter { it.key != id }
                            }

                            InfallibleResult.Retry -> {
                                retry = true
                            }
                        }
                    }

                    retries += 1
                    if (retries >= 3) {
                        _tooManyFailures.update { true }
                        break
                    }

                    delay(1000)
                }
            }
        }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp) {
        busy.waitFor { !it }
        dataSource.push(
            newTopUp.uuid, InfallibleApiRequest(InfallibleApiRequestKind.TopUp(newTopUp))
        )
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale) {
        busy.waitFor { !it }
        dataSource.push(
            newTicketSale.uuid,
            InfallibleApiRequest(InfallibleApiRequestKind.TicketSale(newTicketSale))
        )
    }

    suspend fun clear() {
        dataSource.clear()
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