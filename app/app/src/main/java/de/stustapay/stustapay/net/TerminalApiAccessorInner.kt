package de.stustapay.stustapay.net

import android.util.Log
import com.ionspin.kotlin.bignum.serialization.kotlinx.biginteger.bigIntegerhumanReadableSerializerModule
import de.stustapay.api.apis.AuthApi
import de.stustapay.api.apis.BaseApi
import de.stustapay.api.apis.CashierApi
import de.stustapay.api.apis.CustomerApi
import de.stustapay.api.apis.EntryApi
import de.stustapay.api.apis.MgmtApi
import de.stustapay.api.apis.OrderApi
import de.stustapay.api.apis.UserApi
import de.stustapay.libssp.util.offsetDateTimeSerializerModule
import de.stustapay.libssp.util.uuidSerializersModule
import de.stustapay.stustapay.BuildConfig
import de.stustapay.stustapay.model.RegistrationState
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.cio.CIO
import io.ktor.client.engine.cio.CIOEngineConfig
import io.ktor.client.engine.cio.endpoint
import io.ktor.client.plugins.HttpRequestRetry
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import java.io.Closeable
import java.util.concurrent.atomic.AtomicInteger

data class APIs(
    val authApi: AuthApi,
    val baseApi: BaseApi,
    val cashierApi: CashierApi,
    val customerApi: CustomerApi,
    val entryApi: EntryApi,
    val orderApi: OrderApi,
    val userApi: UserApi,
    val mgmtApi: MgmtApi
)

internal interface ApiEngineHandle : Closeable {
    val id: Int
    val engine: HttpClientEngine
}

private class DefaultApiEngineHandle(
    override val id: Int,
    override val engine: HttpClientEngine,
) : ApiEngineHandle {
    override fun close() {
        engine.close()
    }
}

internal data class ApiSnapshotDebugInfo(
    val engineId: Int,
    val registrationState: RegistrationState,
)

private data class ApiSnapshot(
    val registrationState: RegistrationState,
    val engineHandle: ApiEngineHandle,
    val apis: APIs,
)

/**
 * Manages API access for the terminal application.
 * Implements Closeable to ensure proper resource cleanup.
 */
internal class TerminalApiAccessorInner(
    registrationState: Flow<RegistrationState>,
    private val retry: Boolean,
    private val logRequests: Boolean = BuildConfig.DEBUG,
    private val engineRetirementDelayMillis: Long = DEFAULT_ENGINE_RETIREMENT_DELAY_MILLIS,
    private val engineHandleFactory: (Int) -> ApiEngineHandle = ::createDefaultEngineHandle,
) : Closeable {

    private val ioScope: CoroutineScope =
        CoroutineScope(Dispatchers.IO + SupervisorJob() + CoroutineName("TerminalApiAccessorInner-IO"))
    private val stateScope: CoroutineScope =
        CoroutineScope(Dispatchers.Default + SupervisorJob() + CoroutineName("TerminalApiAccessorInner-State"))
    private val lifecycleMutex = Mutex()
    private val retiredEnginesLock = Any()

    private val connectionFailures = AtomicInteger(0)
    private val engineIdGenerator = AtomicInteger(0)
    private val _clientStatus = MutableStateFlow("INITIALIZED")
    val clientStatus: StateFlow<String> = _clientStatus
    @Volatile
    private var currentRegistrationState: RegistrationState = RegistrationState.NotRegistered("initialization")
    @Volatile
    private var currentSnapshot: ApiSnapshot? = null
    private val retiredEngineHandles = LinkedHashMap<Int, ApiEngineHandle>()
    private val retirementJobs = LinkedHashMap<Int, Job>()

    private val connectionFailureThreshold = 3

    init {
        stateScope.launch {
            registrationState.collect { latestRegistrationState ->
                lifecycleMutex.withLock {
                    currentRegistrationState = latestRegistrationState
                    publishSnapshotLocked(latestRegistrationState, forceRebuild = false)
                }
            }
        }
    }

    private fun newEngineHandle(): ApiEngineHandle {
        connectionFailures.set(0)
        _clientStatus.value = "CLIENT_CREATED"
        return engineHandleFactory(engineIdGenerator.incrementAndGet())
    }

    private fun createApis(apiUrl: String, token: String?, engine: HttpClientEngine): APIs {
        val authApi = AuthApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val baseApi = BaseApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val cashierApi = CashierApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val customerApi = CustomerApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val entryApi = EntryApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val orderApi = OrderApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val userApi = UserApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )
        val mgmtApi = MgmtApi(
            baseUrl = apiUrl,
            httpClientEngine = engine,
            httpClientConfig = ::configureApi,
        )

        if (token != null) {
            authApi.setAccessToken(token)
            baseApi.setAccessToken(token)
            cashierApi.setAccessToken(token)
            customerApi.setAccessToken(token)
            entryApi.setAccessToken(token)
            orderApi.setAccessToken(token)
            userApi.setAccessToken(token)
            mgmtApi.setAccessToken(token)
        }

        return APIs(
            authApi = authApi,
            baseApi = baseApi,
            cashierApi = cashierApi,
            customerApi = customerApi,
            entryApi = entryApi,
            orderApi = orderApi,
            userApi = userApi,
            mgmtApi = mgmtApi,
        )
    }

    private fun buildSnapshot(registrationState: RegistrationState): ApiSnapshot? {
        return when (registrationState) {
            is RegistrationState.Registered -> createConnectedSnapshot(
                registrationState = registrationState,
                apiUrl = registrationState.apiUrl,
                token = registrationState.token,
            )
            is RegistrationState.Registering -> createConnectedSnapshot(
                registrationState = registrationState,
                apiUrl = registrationState.apiUrl,
                token = null,
            )
            is RegistrationState.NotRegistered -> null
            is RegistrationState.Error -> null
        }
    }

    private fun createConnectedSnapshot(
        registrationState: RegistrationState,
        apiUrl: String,
        token: String?,
    ): ApiSnapshot {
        val engineHandle = newEngineHandle()
        return try {
            ApiSnapshot(
                registrationState = registrationState,
                engineHandle = engineHandle,
                apis = createApis(apiUrl, token, engineHandle.engine),
            )
        } catch (e: Exception) {
            closeEngineHandle(engineHandle, "snapshot build failure")
            throw e
        }
    }

    private fun publishSnapshotLocked(registrationState: RegistrationState, forceRebuild: Boolean) {
        if (!forceRebuild && currentSnapshot?.registrationState == registrationState) {
            return
        }

        val nextSnapshot = buildSnapshot(registrationState)
        val previousSnapshot = currentSnapshot
        currentSnapshot = nextSnapshot
        _clientStatus.value = if (nextSnapshot == null) "APIS_CLEARED" else "APIS_CREATED"
        retireEngineHandle(previousSnapshot?.engineHandle)
    }

    private fun configureApi(conf: HttpClientConfig<*>) {
        conf.install(ContentNegotiation) {
            json(
                Json {
                    prettyPrint = BuildConfig.DEBUG
                    isLenient = true
                    ignoreUnknownKeys = true
                    serializersModule = SerializersModule {
                        include(bigIntegerhumanReadableSerializerModule)
                        include(uuidSerializersModule)
                        include(offsetDateTimeSerializerModule)
                    }
                }
            )
        }

        if (retry) {
            conf.install(HttpRequestRetry) {
                retryOnServerErrors(maxRetries = 3)
                retryOnException(maxRetries = 2, retryOnTimeout = true)
                delayMillis { attempt -> 500L * attempt }
            }
        }

        conf.install(HttpTimeout) {
            connectTimeoutMillis = 10_000
            requestTimeoutMillis = 20_000
            socketTimeoutMillis = 15_000
        }

        if (logRequests) {
            conf.install(Logging) {
                level = LogLevel.INFO
                logger = object : Logger {
                    override fun log(message: String) {
                        Log.d("TeamFestlichPay req", message)
                    }
                }
            }
        }

        conf.followRedirects = true
        conf.expectSuccess = false
    }

    fun recordConnectionFailure() {
        val failures = connectionFailures.incrementAndGet()
        Log.d("TeamFestlichPay", "Connection failure recorded: $failures/$connectionFailureThreshold")

        if (failures >= connectionFailureThreshold) {
            Log.w("TeamFestlichPay", "Connection failure threshold reached, resetting client")
            resetClient()
        }
    }

    fun resetClient() {
        ioScope.launch {
            lifecycleMutex.withLock {
                _clientStatus.value = "RESETTING"
                publishSnapshotLocked(currentRegistrationState, forceRebuild = true)
                _clientStatus.value = "RESET_COMPLETE"
                Log.d("TeamFestlichPay", "Client reset completed")
            }
        }
    }

    override fun close() {
        val activeSnapshot = currentSnapshot
        currentSnapshot = null
        val retiredHandles = synchronized(retiredEnginesLock) {
            retirementJobs.values.forEach { it.cancel() }
            retirementJobs.clear()
            val handles = retiredEngineHandles.values.toList()
            retiredEngineHandles.clear()
            handles
        }

        ioScope.cancel()
        stateScope.cancel()

        closeEngineHandle(activeSnapshot?.engineHandle, "active close")
        retiredHandles.forEach { closeEngineHandle(it, "retired close") }
    }

    fun auth(): AuthApi? = currentSnapshot?.apis?.authApi

    fun base(): BaseApi? = currentSnapshot?.apis?.baseApi

    fun cashier(): CashierApi? = currentSnapshot?.apis?.cashierApi

    fun customer(): CustomerApi? = currentSnapshot?.apis?.customerApi

    fun entry(): EntryApi? = currentSnapshot?.apis?.entryApi

    fun order(): OrderApi? = currentSnapshot?.apis?.orderApi

    fun user(): UserApi? = currentSnapshot?.apis?.userApi

    fun mgmt(): MgmtApi? = currentSnapshot?.apis?.mgmtApi

    internal fun currentSnapshotDebugInfo(): ApiSnapshotDebugInfo? {
        return currentSnapshot?.let {
            ApiSnapshotDebugInfo(
                engineId = it.engineHandle.id,
                registrationState = it.registrationState,
            )
        }
    }

    private fun retireEngineHandle(engineHandle: ApiEngineHandle?) {
        if (engineHandle == null) {
            return
        }

        if (engineRetirementDelayMillis <= 0) {
            closeEngineHandle(engineHandle, "immediate retirement")
            return
        }

        synchronized(retiredEnginesLock) {
            retiredEngineHandles[engineHandle.id] = engineHandle
            retirementJobs[engineHandle.id] = ioScope.launch {
                delay(engineRetirementDelayMillis)
                closeRetiredEngineHandle(engineHandle.id)
            }
        }
    }

    private fun closeRetiredEngineHandle(engineId: Int) {
        val engineHandle = synchronized(retiredEnginesLock) {
            retirementJobs.remove(engineId)
            retiredEngineHandles.remove(engineId)
        } ?: return

        closeEngineHandle(engineHandle, "retired after grace period")
    }

    private fun closeEngineHandle(engineHandle: ApiEngineHandle?, reason: String) {
        if (engineHandle == null) {
            return
        }

        try {
            engineHandle.close()
        } catch (e: Exception) {
            Log.e("TeamFestlichPay", "Error closing client engine (${engineHandle.id}, $reason): ${e.message}")
        }
    }

    companion object {
        private const val DEFAULT_ENGINE_RETIREMENT_DELAY_MILLIS = 25_000L

        private fun createDefaultEngineHandle(id: Int): ApiEngineHandle {
            return DefaultApiEngineHandle(
                id = id,
                engine = CIO.create {
                    https { }
                    applyEngineConfig(this)
                },
            )
        }

        private fun applyEngineConfig(conf: CIOEngineConfig) {
            conf.requestTimeout = 20_000
            conf.maxConnectionsCount = 30
            conf.endpoint {
                maxConnectionsPerRoute = 10
                pipelineMaxSize = 5
                keepAliveTime = 5_000
                connectTimeout = 10_000
                connectAttempts = 2
            }
        }
    }
}
