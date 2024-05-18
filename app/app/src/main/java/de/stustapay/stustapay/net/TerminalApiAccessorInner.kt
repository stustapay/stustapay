package de.stustapay.stustapay.net

import android.util.Log
import com.ionspin.kotlin.bignum.serialization.kotlinx.biginteger.bigIntegerhumanReadableSerializerModule
import de.stustapay.api.apis.AuthApi
import de.stustapay.api.apis.BaseApi
import de.stustapay.api.apis.CashierApi
import de.stustapay.api.apis.CustomerApi
import de.stustapay.api.apis.MgmtApi
import de.stustapay.api.apis.OrderApi
import de.stustapay.api.apis.UserApi
import de.stustapay.libssp.util.offsetDateTimeSerializerModule
import de.stustapay.libssp.util.uuidSerializersModule
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
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
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule


data class APIs(
    val authApi: AuthApi,
    val baseApi: BaseApi,
    val cashierApi: CashierApi,
    val customerApi: CustomerApi,
    val orderApi: OrderApi,
    val userApi: UserApi,
    val mgmtApi: MgmtApi
)

class TerminalApiAccessorInner(
    registrationRepository: RegistrationRepositoryInner,
    private val retry: Boolean = false,
    private val logRequests: Boolean = true
) {
    // Unconfined because we need to see updates to the registration state here as soon as they are emitted
    private val scope: CoroutineScope =
        CoroutineScope(Dispatchers.Unconfined + CoroutineName("TerminalApiAccessorInner"))


    private var apis: StateFlow<APIs?> = registrationRepository.registrationState.map {
        when (it) {
            is RegistrationState.Registered -> {
                val authApi = AuthApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                authApi.setAccessToken(it.token)

                val baseApi = BaseApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                baseApi.setAccessToken(it.token)

                val cashierApi =
                    CashierApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                cashierApi.setAccessToken(it.token)

                val customerApi =
                    CustomerApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                customerApi.setAccessToken(it.token)

                val orderApi =
                    OrderApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                orderApi.setAccessToken(it.token)

                val userApi = UserApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                userApi.setAccessToken(it.token)

                val mgmtApi = MgmtApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                mgmtApi.setAccessToken(it.token)

                APIs(
                    authApi = authApi,
                    baseApi = baseApi,
                    cashierApi = cashierApi,
                    customerApi = customerApi,
                    orderApi = orderApi,
                    userApi = userApi,
                    mgmtApi = mgmtApi
                )
            }

            is RegistrationState.Registering -> {
                APIs(authApi = AuthApi(it.apiUrl,
                    CIO.create { this.https {} }) { configureApi(it) },
                    baseApi = BaseApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) },
                    cashierApi = CashierApi(it.apiUrl, CIO.create { this.https {} }) {
                        configureApi(
                            it
                        )
                    },
                    customerApi = CustomerApi(
                        it.apiUrl,
                        CIO.create { this.https {} }) { configureApi(it) },
                    orderApi = OrderApi(
                        it.apiUrl,
                        CIO.create { this.https {} }) { configureApi(it) },
                    userApi = UserApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) },
                    mgmtApi = MgmtApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) })
            }

            is RegistrationState.NotRegistered -> {
                null
            }

            is RegistrationState.Error -> {
                null
            }
        }
    }.stateIn(scope, SharingStarted.Eagerly, null)

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

        conf.followRedirects = true

        conf.expectSuccess = false

        conf.install(Logging)
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