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
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import io.ktor.client.HttpClient
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
import kotlinx.coroutines.IO
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import java.io.Closeable
import java.net.InetAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds


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

/**
 * Manages API access for the terminal application.
 * Implements Closeable to ensure proper resource cleanup.
 */
class TerminalApiAccessorInner(
    registrationRepository: RegistrationRepositoryInner,
    private val retry: Boolean,
    private val logRequests: Boolean = true
) : Closeable {
    
    // Use a dedicated IO dispatcher with a supervisor job for background operations
    private val ioScope: CoroutineScope =
        CoroutineScope(Dispatchers.IO + SupervisorJob() + CoroutineName("TerminalApiAccessorInner-IO"))
    
    // Use Unconfined dispatcher for state collection to ensure immediate updates
    private val stateScope: CoroutineScope =
        CoroutineScope(Dispatchers.Unconfined + SupervisorJob() + CoroutineName("TerminalApiAccessorInner-State"))
    
    // Cache for DNS resolutions to manage DNS entries
    private val dnsCache = ConcurrentHashMap<String, Pair<InetAddress, Long>>()
    
    // Single shared client for cleanup purposes
    private val sharedClient = AtomicReference<HttpClient>()
    
    // Track connection failures to trigger client reset when needed
    private val connectionFailures = AtomicInteger(0)
    
    // Status of client (for monitoring)
    private val _clientStatus = MutableStateFlow("INITIALIZED")
    val clientStatus: StateFlow<String> = _clientStatus

    // DNS cache TTL - 5 minutes
    private val DNS_CACHE_TTL = 5 * 60 * 1000L
    
    // Connection failure threshold before reset
    private val CONNECTION_FAILURE_THRESHOLD = 3
    
    init {
        // Create initial client for reference only
        createNewClient()
        
        // Start periodic DNS cache cleanup
        startDnsCacheCleanup()
    }

    private var apis: StateFlow<APIs?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                createApis(it.apiUrl, it.token)
            }

            is RegistrationState.Registering -> {
                createApis(it.apiUrl, null)
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(stateScope, SharingStarted.Eagerly, null)
    
    /**
     * Creates a new set of API clients
     */
    private fun createApis(apiUrl: String, token: String?): APIs {
        // Resolve and cache DNS for the API host
        prefetchDns(apiUrl)
        
        // Create API instances with a new CIO engine for each API but with the same configuration
        val authApi = AuthApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )
        
        val baseApi = BaseApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )
        
        val cashierApi = CashierApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )
        
        val customerApi = CustomerApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )

        val entryApi = EntryApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create {
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> ->
                configureApi(conf)
            }
        )
        
        val orderApi = OrderApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )
        
        val userApi = UserApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )
        
        val mgmtApi = MgmtApi(
            baseUrl = apiUrl,
            httpClientEngine = CIO.create { 
                this.https { }
            },
            httpClientConfig = { conf: HttpClientConfig<*> -> 
                configureApi(conf) 
            }
        )
        
        // Set token if available
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
            mgmtApi = mgmtApi
        )
    }

    /**
     * Creates a new HTTP client (for reference and cleanup only)
     */
    private fun createNewClient(): HttpClient {
        val client = HttpClient(CIO.create()) { 
            configureApi(this)
        }
        
        // Store the client reference for cleanup
        sharedClient.set(client)
        _clientStatus.value = "CLIENT_CREATED"
        
        // Reset failure counter
        connectionFailures.set(0)
        
        return client
    }
    
    /**
     * Configures the HTTP client
     */
    private fun configureApi(conf: HttpClientConfig<*>) {
        conf.install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                serializersModule = SerializersModule {
                    this.include(bigIntegerhumanReadableSerializerModule)
                    this.include(uuidSerializersModule)
                    this.include(offsetDateTimeSerializerModule)
                }
            })
        }

        if (retry) {
            conf.install(HttpRequestRetry) {
                retryOnServerErrors(maxRetries = 3)
                retryOnException(maxRetries = 2, retryOnTimeout = true)
                // Shorter delay for mobile network conditions
                this.delayMillis { attempt -> 500L * attempt }
            }
        }

        conf.install(HttpTimeout) {
            connectTimeoutMillis = 10000  // Reduced from 15000
            requestTimeoutMillis = 20000  // Reduced from 30000
            socketTimeoutMillis = 15000   // Reduced from 20000
        }

        (conf as? HttpClientConfig<CIOEngineConfig>)?.engine {
            requestTimeout = 20000 // Reduced from 30000
            
            // Reduced connection pool sizes for mobile environment
            maxConnectionsCount = 30 // Reduced from 1000
            
            endpoint {
                maxConnectionsPerRoute = 10 // Reduced from 100
                pipelineMaxSize = 5 // Reduced from 20
                keepAliveTime = 5000
                connectTimeout = 10000 // Reduced from 15000
                connectAttempts = 2 // Reduced from 3
            }
        }

        if (logRequests) {
            conf.install(Logging) {
                level = LogLevel.INFO // Reduced from ALL for performance
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
    
    /**
     * Prefetches and caches DNS for a given URL
     */
    private fun prefetchDns(url: String) {
        ioScope.launch {
            try {
                val host = url.removePrefix("https://").removePrefix("http://").split("/")[0].split(":")[0]
                
                // Check if we need to refresh the DNS
                val current = dnsCache[host]
                if (current == null || System.currentTimeMillis() - current.second > DNS_CACHE_TTL) {
                    val address = InetAddress.getByName(host)
                    dnsCache[host] = Pair(address, System.currentTimeMillis())
                    Log.d("TeamFestlichPay DNS", "Refreshed DNS for $host: ${address.hostAddress}")
                }
            } catch (e: Exception) {
                Log.e("TeamFestlichPay DNS", "Failed to prefetch DNS: ${e.message}")
            }
        }
    }
    
    /**
     * Periodically cleans up expired DNS cache entries
     */
    private fun startDnsCacheCleanup() {
        ioScope.launch {
            while (true) {
                try {
                    // Remove expired entries
                    val now = System.currentTimeMillis()
                    val expiredEntries = dnsCache.entries.filter { now - it.value.second > DNS_CACHE_TTL }
                    expiredEntries.forEach { dnsCache.remove(it.key) }
                    
                    kotlinx.coroutines.delay(60.seconds)
                } catch (e: Exception) {
                    Log.e("TeamFestlichPay DNS", "Error in DNS cache cleanup: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Records a connection failure and resets client if threshold exceeded
     */
    fun recordConnectionFailure() {
        val failures = connectionFailures.incrementAndGet()
        Log.d("TeamFestlichPay", "Connection failure recorded: $failures/$CONNECTION_FAILURE_THRESHOLD")
        
        if (failures >= CONNECTION_FAILURE_THRESHOLD) {
            Log.w("TeamFestlichPay", "Connection failure threshold reached, resetting client")
            resetClient()
        }
    }
    
    /**
     * Forcibly resets the network clients by recreating APIs
     */
    fun resetClient() {
        ioScope.launch {
            _clientStatus.value = "RESETTING"
            
            try {
                // Close old client if it exists
                sharedClient.get()?.close()
            } catch (e: Exception) {
                Log.e("TeamFestlichPay", "Error closing client: ${e.message}")
            }
            
            // Create new client for reference
            createNewClient()
            
            // Clear DNS cache
            dnsCache.clear()
            
            _clientStatus.value = "RESET_COMPLETE"
            Log.d("TeamFestlichPay", "Client reset completed")
        }
    }

    /**
     * Cleanup resources when no longer needed
     */
    override fun close() {
        try {
            // Cancel both coroutine scopes to prevent memory leaks
            ioScope.cancel()
            stateScope.cancel()
            
            // Close the HTTP client
            sharedClient.get()?.close()
        } catch (e: Exception) {
            Log.e("TeamFestlichPay", "Error closing client: ${e.message}")
        }
    }

    fun auth(): AuthApi? {
        return apis.value?.authApi
    }

    fun base(): BaseApi? {
        return apis.value?.baseApi
    }

    fun cashier(): CashierApi? {
        return apis.value?.cashierApi
    }

    fun customer(): CustomerApi? {
        return apis.value?.customerApi
    }

    fun entry(): EntryApi? {
        return apis.value?.entryApi
    }

    fun order(): OrderApi? {
        return apis.value?.orderApi
    }

    fun user(): UserApi? {
        return apis.value?.userApi
    }

    fun mgmt(): MgmtApi? {
        return apis.value?.mgmtApi
    }
}
