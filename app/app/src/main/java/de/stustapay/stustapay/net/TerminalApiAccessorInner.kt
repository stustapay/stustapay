package de.stustapay.stustapay.net

import android.util.Log
import androidx.compose.runtime.collectAsState
import com.ionspin.kotlin.bignum.serialization.kotlinx.biginteger.bigIntegerhumanReadableSerializerModule
import com.ionspin.kotlin.bignum.serialization.kotlinx.humanReadableSerializerModule
import de.stustapay.api.apis.AuthApi
import de.stustapay.api.apis.BaseApi
import de.stustapay.api.apis.CashierApi
import de.stustapay.api.apis.CustomerApi
import de.stustapay.api.apis.OrderApi
import de.stustapay.api.apis.UserApi
import de.stustapay.libssp.util.uuidSerializersModule
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.repository.RegistrationRepository
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.cio.CIO
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
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.last
import kotlinx.coroutines.flow.lastOrNull
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.singleOrNull
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule

class TerminalApiAccessorInner(
    registrationRepository: RegistrationRepositoryInner,
    private val retry: Boolean = false,
    private val logRequests: Boolean = true
) {
    // Unconfined because we need to see updates to the registration state here as soon as they are emitted
    private val scope: CoroutineScope =
        CoroutineScope(Dispatchers.Unconfined + CoroutineName("TerminalApiAccessorInner"))

    private var authApi: StateFlow<AuthApi?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                val authApi = AuthApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                authApi.setAccessToken(it.token)
                authApi
            }

            is RegistrationState.Registering -> {
                AuthApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(scope, SharingStarted.Eagerly, null)

    private var baseApi: StateFlow<BaseApi?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                val baseApi = BaseApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                baseApi.setAccessToken(it.token)
                baseApi
            }

            is RegistrationState.Registering -> {
                BaseApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(scope, SharingStarted.Eagerly, null)

    private var cashierApi: StateFlow<CashierApi?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                val cashierApi =
                    CashierApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                cashierApi.setAccessToken(it.token)
                cashierApi
            }

            is RegistrationState.Registering -> {
                CashierApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(scope, SharingStarted.Eagerly, null)

    private var customerApi: StateFlow<CustomerApi?> =
        registrationRepository.registrationState.map {
            when (it) {
                is RegistrationState.Registered -> {
                    val customerApi =
                        CustomerApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                    customerApi.setAccessToken(it.token)
                    customerApi
                }

                is RegistrationState.Registering -> {
                    CustomerApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                }

                is RegistrationState.NotRegistered -> {
                    null
                }

                is RegistrationState.Error -> {
                    null
                }
            }
        }.stateIn(scope, SharingStarted.Eagerly, null)

    private var orderApi: StateFlow<OrderApi?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                val orderApi =
                    OrderApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                orderApi.setAccessToken(it.token)
                orderApi
            }

            is RegistrationState.Registering -> {
                OrderApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(scope, SharingStarted.Eagerly, null)

    private var userApi: StateFlow<UserApi?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                val userApi = UserApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                userApi.setAccessToken(it.token)
                userApi
            }

            is RegistrationState.Registering -> {
                UserApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(scope, SharingStarted.Eagerly, null)

    fun configureApi(conf: HttpClientConfig<*>) {
        conf.install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                serializersModule = SerializersModule {
                    this.include(bigIntegerhumanReadableSerializerModule)
                    this.include(uuidSerializersModule)
                }
            })
        }

        if (retry) {
            conf.install(HttpRequestRetry) {
                retryOnServerErrors(maxRetries = 5)
                retryOnException(maxRetries = 3, retryOnTimeout = true)
                exponentialDelay()
            }
        }

        conf.install(HttpTimeout) {
            connectTimeoutMillis = 5000
            requestTimeoutMillis = 10000
            socketTimeoutMillis = 10000
        }

        if (logRequests) {
            conf.install(Logging) {
                level = LogLevel.ALL
                logger = object : Logger {
                    override fun log(message: String) {
                        Log.d("StuStaPay req", message)
                    }
                }
            }
        }

        conf.expectSuccess = false

        conf.install(Logging)
    }

    fun auth(): AuthApi? {
        return authApi.value
    }

    fun base(): BaseApi? {
        return baseApi.value
    }

    fun cashier(): CashierApi? {
        return cashierApi.value
    }

    fun customer(): CustomerApi? {
        return customerApi.value
    }

    fun order(): OrderApi? {
        return orderApi.value
    }

    fun user(): UserApi? {
        return userApi.value
    }
}