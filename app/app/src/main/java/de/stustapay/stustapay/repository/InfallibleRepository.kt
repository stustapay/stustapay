package de.stustapay.stustapay.repository

import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.CompletedTopUp
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.NewTopUp
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.mapState
import de.stustapay.libssp.util.waitFor
import de.stustapay.stustapay.model.InfallibleApiRequest
import de.stustapay.stustapay.model.InfallibleApiRequestKind
import de.stustapay.stustapay.model.InfallibleResult
import de.stustapay.stustapay.storage.InfallibleApiRequestLocalDataSource
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton


/**
 * this is architecturally wrong and needs a rewrite
 * we want to guarantee that there's only one pending request ever.
 * this request should be persisted and then ensured to be submitted.
 * and this should be implemented in a generic way for other transactions.
 *
 * currently it can store and handle multiple pending transactions,
 * but not report status about them.
 */
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
    val currentRequest: Flow<InfallibleApiRequest?> =
        dataSource.requests.map { it.values.firstOrNull() }

    // when this is true, show the overlay popup that blocks all other actions.
    private val _tooManyFailures = MutableStateFlow(false)
    val tooManyFailures: Flow<Boolean> = _tooManyFailures

    // so we can pick out attempted jobs

    private val _resultsTopUp =
        MutableStateFlow<Map<UUID, InfallibleResult<CompletedTopUp>>>(mapOf())
    val resultTopUp = _resultsTopUp.asStateFlow().mapState(null, scope) { it.values.firstOrNull() }

    private val _resultsTicketSale =
        MutableStateFlow<Map<UUID, InfallibleResult<CompletedTicketSale>>>(mapOf())
    val resultTicketSale =
        _resultsTopUp.asStateFlow().mapState(null, scope) { it.values.firstOrNull() }

    fun launch() {
        runner = scope.launch {
            dataSource.requests.collect { pendingRequests ->
                _tooManyFailures.update { false }

                val toSubmit = pendingRequests

                val reqErrors = mutableMapOf<UUID, Response.Error>()

                // todo: please somebody generalize...
                val resultsTopUp = mutableMapOf<UUID, InfallibleResult<CompletedTopUp>>()
                val resultsTicketSale = mutableMapOf<UUID, InfallibleResult<CompletedTicketSale>>()

                val maxAttempts = 3
                for (attempt in 1..maxAttempts) {
                    for ((id, request) in toSubmit) {
                        when (request.kind) {
                            is InfallibleApiRequestKind.TopUp -> {
                                val result = topUpRepository.bookTopUp(request.kind.content)

                                if (result.submitSuccess()) {
                                    resultsTopUp[id] = InfallibleResult.OK(result)
                                    dataSource.remove(id)
                                } else {
                                    reqErrors[id] = result as Response.Error
                                }
                            }

                            is InfallibleApiRequestKind.TicketSale -> {
                                val result = ticketRepository.bookTicketSale(request.kind.content)

                                if (result.submitSuccess()) {
                                    resultsTicketSale[id] = InfallibleResult.OK(result)
                                    dataSource.remove(id)
                                } else {
                                    reqErrors[id] = result as Response.Error
                                }
                            }
                        }
                    }

                    if (toSubmit.isEmpty()) {
                        break
                    }

                    // retry delay
                    delay(1000)
                }

                // remove successful items
                // in one update step, so the datasource flow will only emit one new state
                dataSource.remove(resultsTopUp.keys.union(resultsTicketSale.keys))

                // some requests were not successful -> transform the errors to results
                if (toSubmit.isNotEmpty()) {
                    for ((id, request) in toSubmit) {
                        when (request.kind) {
                            is InfallibleApiRequestKind.TopUp -> {
                                // all remaining toSubmit entries were ensured to convert to errors
                                resultsTicketSale[id] =
                                    InfallibleResult.TooManyTries(maxAttempts, reqErrors[id]!!)
                            }

                            is InfallibleApiRequestKind.TicketSale -> {
                                resultsTopUp[id] =
                                    InfallibleResult.TooManyTries(maxAttempts, reqErrors[id]!!)
                            }
                        }
                    }
                    // when failed too often:
                    _tooManyFailures.update { true }
                }

                // results
                _resultsTopUp.emit(resultsTopUp)
                _resultsTicketSale.emit(resultsTicketSale)
            }
        }
    }

    suspend fun bookTopUp(newTopUp: NewTopUp): InfallibleResult<CompletedTopUp> {
        busy.waitFor { !it }
        dataSource.push(
            newTopUp.uuid, InfallibleApiRequest(InfallibleApiRequestKind.TopUp(newTopUp))
        )

        return _resultsTopUp.waitFor {
            it.containsKey(newTopUp.uuid)
        }[newTopUp.uuid]!!
    }

    suspend fun bookTicketSale(newTicketSale: NewTicketSale): InfallibleResult<CompletedTicketSale> {
        busy.waitFor { !it }
        dataSource.push(
            newTicketSale.uuid,
            InfallibleApiRequest(InfallibleApiRequestKind.TicketSale(newTicketSale))
        )

        return _resultsTicketSale.waitFor {
            it.containsKey(newTicketSale.uuid)
        }[newTicketSale.uuid]!!
    }

    suspend fun clear() {
        dataSource.clear()
    }
}
